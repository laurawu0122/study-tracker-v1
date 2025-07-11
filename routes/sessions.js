const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const moment = require('moment');
const achievementService = require('../services/achievements');
const { createNotification } = require('./notifications');

const router = express.Router();

// JWT middleware
const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
};

// Validation middleware for new format
const validateSession = [
  body('studyDate')
    .isDate()
    .withMessage('学习日期格式不正确'),
  body('projectName')
    .notEmpty()
    .withMessage('学习项目名称不能为空'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('开始时间格式不正确'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('结束时间格式不正确'),
  body('duration')
    .isInt({ min: 1, max: 1440 })
    .withMessage('学习时长必须是1-1440分钟之间的整数'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('备注长度不能超过500个字符'),
];

// Get all sessions for current user with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, projectName } = req.query;
    const offset = (page - 1) * limit;

    console.log('=== 学习记录查询参数 ===');
    console.log('原始参数:', req.query);
    console.log('页码:', page, '类型:', typeof page);
    console.log('限制:', limit, '类型:', typeof limit);
    console.log('偏移量:', offset, '类型:', typeof offset);

    // 使用LEFT JOIN关联项目表，优先使用项目表的名称
    let query = db('study_sessions')
      .leftJoin('study_projects', function() {
        this.on(function() {
          // 如果project_id不为null，直接关联
          this.on('study_sessions.project_id', '=', 'study_projects.id');
        }).orOn(function() {
          // 如果project_id为null，尝试根据project_name中的ID关联
          this.onNull('study_sessions.project_id')
              .andOn(db.raw('study_projects.id::text'), '=', 'study_sessions.project_name');
        });
      })
      .where('study_sessions.user_id', req.user.id)
      .orderByRaw('study_sessions.study_date::text DESC, study_sessions.start_time_new DESC');

    // 搜索功能
    if (search) {
      query = query.where(function() {
        this.where('study_projects.name', 'like', `%${search}%`)
             .orWhere('study_sessions.project_name', 'like', `%${search}%`)
             .orWhere('study_sessions.notes', 'like', `%${search}%`);
      });
    }

    // 项目筛选
    if (projectName) {
      query = query.where(function() {
        this.where('study_projects.name', projectName)
             .orWhere('study_sessions.project_name', projectName);
      });
    }

    // Get total count
    const totalQuery = query.clone();
    // 移除ORDER BY子句，因为count查询不需要排序
    totalQuery.clearOrder();
    const [{ total }] = await totalQuery.count('* as total');

    console.log('总记录数:', total);

    // Get paginated results - 优先使用项目表的名称
    let sessions = await query
      .select(
        'study_sessions.id',
        'study_sessions.study_date',
        db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name'),
        'study_sessions.start_time_new',
        'study_sessions.end_time_new',
        'study_sessions.duration',
        'study_sessions.notes',
        'study_sessions.created_at'
      )
      .limit(limit)
      .offset(offset);
    
    console.log('原始查询结果:', sessions);
    
    // 确保日期格式正确，避免时区转换
    sessions = sessions.map(s => ({ 
      ...s, 
      // 强制转换为文本格式日期，避免时区转换
      study_date: typeof s.study_date === 'string' ? s.study_date : 
        s.study_date instanceof Date ? 
          `${s.study_date.getFullYear()}-${String(s.study_date.getMonth() + 1).padStart(2, '0')}-${String(s.study_date.getDate()).padStart(2, '0')}` : 
          s.study_date,
      // 修复时间格式，去掉秒数部分
      start_time_new: s.start_time_new ? s.start_time_new.substring(0, 5) : '--:--',
      end_time_new: s.end_time_new ? s.end_time_new.substring(0, 5) : '--:--'
    }));
    
    console.log('格式化后结果:', sessions);

    console.log('返回记录数:', sessions.length);
    console.log('分页信息:', {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    });

    res.json({
      sessions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('获取会话列表错误:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

// Get session statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Today's minutes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ todayMinutes }] = await db('study_sessions')
      .where('user_id', userId)
      .where('study_date', '>=', today.toISOString().split('T')[0])
      .whereNotNull('duration')
      .sum('duration as todayMinutes');

    // This week's minutes
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const [{ weekMinutes }] = await db('study_sessions')
      .where('user_id', userId)
      .where('study_date', '>=', weekStart.toISOString().split('T')[0])
      .whereNotNull('duration')
      .sum('duration as weekMinutes');

    // Total minutes
    const [{ totalMinutes }] = await db('study_sessions')
      .where('user_id', userId)
      .whereNotNull('duration')
      .sum('duration as totalMinutes');

    // Total sessions
    const [{ totalSessions }] = await db('study_sessions')
      .where('user_id', userId)
      .count('* as totalSessions');

    res.json({
      todayMinutes: todayMinutes || 0,
      weekMinutes: weekMinutes || 0,
      totalMinutes: totalMinutes || 0,
      totalSessions: totalSessions || 0
    });

  } catch (error) {
    console.error('获取会话统计错误:', error);
    res.status(500).json({ error: '获取会话统计失败' });
  }
});

// Get chart data
router.get('/chart-data', authenticateToken, async (req, res) => {
  try {
    const { type, timeRange, startDate, endDate, projectName, durationRange } = req.query;
    const userId = req.user.id;

    console.log('图表数据查询参数:', { type, timeRange, startDate, endDate, projectName, durationRange });

    let chartData = {};

    if (type === 'line') {
      // 获取学习时长趋势折线图
      let startDateFilter, endDateFilter;
      
      if (timeRange === 'custom' && startDate && endDate) {
        startDateFilter = startDate;
        endDateFilter = endDate;
      } else {
        const days = parseInt(timeRange) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDateFilter = startDate.toISOString().split('T')[0];
        endDateFilter = new Date().toISOString().split('T')[0];
      }

      let query = db('study_sessions')
        .leftJoin('study_projects', 'study_sessions.project_id', 'study_projects.id')
        .where('study_sessions.user_id', userId)
        .where('study_sessions.study_date', '>=', startDateFilter)
        .where('study_sessions.study_date', '<=', endDateFilter)
        .whereNotNull('study_sessions.duration');

      // 添加项目筛选
      if (projectName && projectName !== '') {
        query = query.where(function() {
          this.where('study_projects.name', projectName)
            .orWhere('study_sessions.project_name', projectName);
        });
      }

      // 添加时长范围筛选
      if (durationRange && durationRange !== '') {
        const [min, max] = durationRange.split('-');
        if (max === '+') {
          query = query.where('study_sessions.duration', '>=', parseInt(min));
        } else {
          query = query.where('study_sessions.duration', '>=', parseInt(min))
            .where('study_sessions.duration', '<', parseInt(max));
        }
      }

      const trendData = await query
        .select('study_sessions.study_date')
        .sum('study_sessions.duration as total_duration')
        .groupBy('study_sessions.study_date')
        .orderBy('study_sessions.study_date', 'asc');

      chartData = {
        labels: trendData.map(d => {
          const date = new Date(d.study_date);
          return `${date.getMonth() + 1}.${date.getDate()}`;
        }),
        datasets: [{
          label: '学习时长(分钟)',
          data: trendData.map(d => d.total_duration),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };

    } else if (type === 'bar') {
      // 获取每日各项目学习时长柱状图
      let startDateFilter, endDateFilter;
      
      if (timeRange === 'custom' && startDate && endDate) {
        startDateFilter = startDate;
        endDateFilter = endDate;
      } else {
        const days = parseInt(timeRange) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDateFilter = startDate.toISOString().split('T')[0];
        endDateFilter = new Date().toISOString().split('T')[0];
      }

      let query = db('study_sessions')
        .leftJoin('study_projects', 'study_sessions.project_id', 'study_projects.id')
        .where('study_sessions.user_id', userId)
        .where('study_sessions.study_date', '>=', startDateFilter)
        .where('study_sessions.study_date', '<=', endDateFilter)
        .whereNotNull('study_sessions.duration');

      // 添加项目筛选
      if (projectName && projectName !== '') {
        query = query.where(function() {
          this.where('study_projects.name', projectName)
            .orWhere('study_sessions.project_name', projectName);
        });
      }

      // 添加时长范围筛选
      if (durationRange && durationRange !== '') {
        const [min, max] = durationRange.split('-');
        if (max === '+') {
          query = query.where('study_sessions.duration', '>=', parseInt(min));
        } else {
          query = query.where('study_sessions.duration', '>=', parseInt(min))
            .where('study_sessions.duration', '<', parseInt(max));
        }
      }

      const barData = await query
        .select(
          'study_sessions.study_date',
          db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name'),
          db.raw('SUM(study_sessions.duration) as total_duration')
        )
        .groupBy('study_sessions.study_date', 'study_projects.name', 'study_sessions.project_name')
        .orderBy('study_sessions.study_date', 'asc')
        .orderBy('total_duration', 'desc');

      // 按项目分组数据
      const projectGroups = {};
      const dates = new Set();

      barData.forEach(item => {
        const date = item.study_date;
        const project = item.project_name;
        const duration = parseInt(item.total_duration);

        dates.add(date);
        if (!projectGroups[project]) {
          projectGroups[project] = {};
        }
        projectGroups[project][date] = duration;
      });

      const sortedDates = Array.from(dates).sort();
      const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)'
      ];

      chartData = {
        labels: sortedDates.map(d => {
          const date = new Date(d);
          return `${date.getMonth() + 1}.${date.getDate()}`;
        }),
        datasets: Object.keys(projectGroups).map((project, index) => ({
          label: project,
          data: sortedDates.map(date => projectGroups[project][date] || 0),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.8', '1'),
          borderWidth: 1
        }))
      };
    }

    res.json(chartData);

  } catch (error) {
    console.error('获取图表数据错误:', error);
    res.status(500).json({ error: '获取图表数据失败' });
  }
});

// Get session analytics overview
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 基础统计
    const [{ totalSessions }] = await db('study_sessions')
      .where('user_id', userId)
      .count('* as totalSessions');

    const [{ totalMinutes }] = await db('study_sessions')
      .where('user_id', userId)
      .whereNotNull('duration')
      .sum('duration as totalMinutes');

    const [{ totalDays }] = await db('study_sessions')
      .where('user_id', userId)
      .countDistinct('study_date as totalDays');

    const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

    // 最近7天统计
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const [{ weekMinutes }] = await db('study_sessions')
      .where('user_id', userId)
      .where('study_date', '>=', weekStart.toISOString().split('T')[0])
      .whereNotNull('duration')
      .sum('duration as weekMinutes');

    // 项目分布 - 修复GROUP BY错误
    const projectDistribution = await db('study_sessions')
      .leftJoin('study_projects', 'study_sessions.project_id', 'study_projects.id')
      .where('study_sessions.user_id', userId)
      .whereNotNull('study_sessions.duration')
      .select(
        db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name'),
        db.raw('SUM(study_sessions.duration) as total_duration'),
        db.raw('COUNT(*) as session_count')
      )
      .groupBy('study_projects.name', 'study_sessions.project_name')
      .orderBy('total_duration', 'desc')
      .limit(5);

    // 时间分布（按小时）
    const timeDistribution = await db('study_sessions')
      .where('user_id', userId)
      .whereNotNull('start_time_new')
      .select(
        db.raw('EXTRACT(HOUR FROM start_time_new::time) as hour'),
        db.raw('COUNT(*) as session_count')
      )
      .groupBy('hour')
      .orderBy('hour');

    res.json({
      stats: {
        totalSessions: totalSessions || 0,
        totalMinutes: totalMinutes || 0,
        totalDays: totalDays || 0,
        avgMinutes: avgMinutes,
        weekMinutes: weekMinutes || 0
      },
      projectDistribution,
      timeDistribution
    });

  } catch (error) {
    console.error('获取分析数据错误:', error);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

// Create new session
router.post('/', authenticateToken, validateSession, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const {
      studyDate,
      projectName,
      startTime,
      endTime,
      duration,
      notes
    } = req.body;

    // 确保日期格式正确，避免时区问题
    const formattedDate = studyDate; // 直接使用前端传来的日期字符串

    // 根据项目名称查找对应的项目ID
    let projectId = null;
    if (projectName) {
      const project = await db('study_projects')
        .where('user_id', req.user.id)
        .where('name', projectName)
        .first();
      projectId = project ? project.id : null;
    }

    const [result] = await db('study_sessions').insert({
      user_id: req.user.id,
      project_id: projectId, // 设置项目ID
      study_date: formattedDate, // 直接存储日期字符串，不进行时区转换
      project_name: projectName,
      start_time_new: startTime,
      end_time_new: endTime,
      start_time: db.raw(`?::date`, [formattedDate]), // 使用日期类型，避免时区转换
      end_time: db.raw(`?::date`, [formattedDate]), // 使用日期类型，避免时区转换
      duration: duration,
      duration_hours: duration / 60, // 转换为小时
      notes: notes || '',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const sessionId = result.id;

    const session = await db('study_sessions')
      .where('id', sessionId)
      .first();

    // 确保返回的日期格式正确
    if (session) {
      session.study_date = typeof session.study_date === 'string' ? session.study_date : 
        session.study_date instanceof Date ? 
          `${session.study_date.getFullYear()}-${String(session.study_date.getMonth() + 1).padStart(2, '0')}-${String(session.study_date.getDate()).padStart(2, '0')}` : 
          session.study_date;
    }

    res.status(201).json({
      message: '学习记录创建成功',
      session
    });

    // 触发成就检查
    try {
      const durationHours = duration / 60;
      await achievementService.checkAndUpdateAchievements(req.user.id, 'total_hours', {
        session_id: sessionId,
        duration_minutes: duration,
        project_name: projectName
      });
    } catch (achievementError) {
      console.error('成就检查失败:', achievementError);
      // 不影响主流程，只记录错误
    }

    // 发送学习会话通知
    try {
      const durationHours = duration / 60;
      
      // 学习时长达到1小时通知
      if (durationHours >= 1) {
        await createNotification(
          req.user.id,
          'success',
          '⏰ 学习时长提醒',
          `您已经学习了 ${durationHours.toFixed(1)} 小时，继续保持！`,
          {
            session_id: sessionId,
            duration_minutes: duration,
            duration_hours: durationHours,
            project_name: projectName
          }
        );
      }
      
      // 学习时长达到2小时通知
      if (durationHours >= 2) {
        await createNotification(
          req.user.id,
          'info',
          '💪 学习毅力提醒',
          `您已经连续学习了 ${durationHours.toFixed(1)} 小时，建议适当休息！`,
          {
            session_id: sessionId,
            duration_minutes: duration,
            duration_hours: durationHours,
            project_name: projectName
          }
        );
      }

      // 检查今日学习时长
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = await db('study_sessions')
        .where('user_id', req.user.id)
        .where('study_date', today)
        .sum('duration as total_duration');
      
      const todayTotalMinutes = todaySessions[0]?.total_duration || 0;
      const todayTotalHours = todayTotalMinutes / 60;

      // 今日学习时长达到3小时通知
      if (todayTotalHours >= 3) {
        await createNotification(
          req.user.id,
          'success',
          '🎯 今日学习目标达成',
          `恭喜！您今天已经学习了 ${todayTotalHours.toFixed(1)} 小时，目标达成！`,
          {
            today_total_minutes: todayTotalMinutes,
            today_total_hours: todayTotalHours,
            session_count: todaySessions.length
          }
        );
      }

    } catch (notificationError) {
      console.error('发送学习会话通知失败:', notificationError);
      // 不影响主流程，只记录错误
    }

  } catch (error) {
    console.error('创建会话错误:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
});

// Get project names for dropdown
router.get('/projects/list', authenticateToken, async (req, res) => {
  try {
    // 获取用户自己的项目
    const userProjects = await db('study_projects')
      .where('user_id', req.user.id)
      .select('id', 'name')
      .orderBy('name');

    // 如果是普通用户，还需要获取所有管理员创建的项目
    let allProjects = [...userProjects];
    
    if (req.user.role !== 'admin') {
      // 动态获取所有管理员ID
      const adminIds = await db('users').where('role', 'admin').pluck('id');
      const adminProjects = await db('study_projects')
        .whereIn('user_id', adminIds)
        .select('id', 'name')
        .orderBy('name');
      
      // 合并项目列表，去重
      const existingNames = new Set(userProjects.map(p => p.name));
      adminProjects.forEach(project => {
        if (!existingNames.has(project.name)) {
          allProjects.push(project);
          existingNames.add(project.name);
        }
      });
      
      // 重新排序
      allProjects.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({ projects: allProjects });

  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// Get calendar data for a specific month
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.user.id;

    if (!year || !month) {
      return res.status(400).json({ error: '年份和月份参数是必需的' });
    }

    // 构建日期范围
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    console.log('日历查询参数:', { year, month, startDate, endDate, userId });

    // 获取指定月份的所有学习记录 - 使用LEFT JOIN关联项目表
    let sessions = await db('study_sessions')
      .leftJoin('study_projects', function() {
        this.on(function() {
          // 如果project_id不为null，直接关联
          this.on('study_sessions.project_id', '=', 'study_projects.id');
        }).orOn(function() {
          // 如果project_id为null，尝试根据project_name中的ID关联
          this.onNull('study_sessions.project_id')
              .andOn(db.raw('study_projects.id::text'), '=', 'study_sessions.project_name');
        });
      })
      .where('study_sessions.user_id', userId)
      .whereRaw('study_sessions.study_date::date >= ?::date', [startDate])
      .whereRaw('study_sessions.study_date::date <= ?::date', [endDate])
      .select(
        db.raw('study_sessions.study_date::text as study_date'), // 强制转换为文本格式
        db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name'), // 优先使用项目表的名称
        'study_sessions.duration', 
        'study_sessions.start_time_new', 
        'study_sessions.end_time_new'
      )
      .orderBy('study_sessions.study_date', 'asc');
    
    console.log('原始日历数据:', sessions);
    
    // 确保日期格式正确，避免时区转换
    sessions = sessions.map(s => ({ 
      ...s, 
      // 强制转换为文本格式日期，避免时区转换
      study_date: typeof s.study_date === 'string' ? s.study_date : 
        s.study_date instanceof Date ? 
          `${s.study_date.getFullYear()}-${String(s.study_date.getMonth() + 1).padStart(2, '0')}-${String(s.study_date.getDate()).padStart(2, '0')}` : 
          s.study_date,
      // 修复时间格式，去掉秒数部分
      start_time_new: s.start_time_new ? s.start_time_new.substring(0, 5) : '--:--',
      end_time_new: s.end_time_new ? s.end_time_new.substring(0, 5) : '--:--'
    }));

    console.log('格式化后日历数据:', sessions);

    // 按日期分组数据
    const calendarData = {};
    sessions.forEach(session => {
      const date = session.study_date;
      if (!calendarData[date]) {
        calendarData[date] = [];
      }
      calendarData[date].push({
        project_name: session.project_name,
        duration: session.duration,
        start_time_new: session.start_time_new,
        end_time_new: session.end_time_new
      });
    });

    console.log('最终日历数据:', calendarData);

    res.json({
      calendarData,
      totalDays: Object.keys(calendarData).length,
      totalMinutes: sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
    });

  } catch (error) {
    console.error('获取日历数据错误:', error);
    res.status(500).json({ error: '获取日历数据失败' });
  }
});

// Get sessions for a specific date
router.get('/date/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    console.log('日期详情查询:', { date, userId });

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式不正确' });
    }

    // 获取指定日期的所有学习记录 - 使用LEFT JOIN关联项目表
    let sessions = await db('study_sessions')
      .leftJoin('study_projects', function() {
        this.on(function() {
          // 如果project_id不为null，直接关联
          this.on('study_sessions.project_id', '=', 'study_projects.id');
        }).orOn(function() {
          // 如果project_id为null，尝试根据project_name中的ID关联
          this.onNull('study_sessions.project_id')
              .andOn(db.raw('study_projects.id::text'), '=', 'study_sessions.project_name');
        });
      })
      .where('study_sessions.user_id', userId)
      .whereRaw('study_sessions.study_date::date = ?::date', [date]) // 使用日期类型比较，忽略时间部分
      .select(
        'study_sessions.id',
        db.raw('study_sessions.study_date::text as study_date'), // 强制转换为文本格式
        db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name'), // 优先使用项目表的名称
        'study_sessions.start_time_new',
        'study_sessions.end_time_new',
        'study_sessions.duration',
        'study_sessions.notes',
        'study_sessions.created_at'
      )
      .orderBy('study_sessions.start_time_new', 'asc');
    
    console.log('原始日期数据:', sessions);
    
    // 确保日期格式正确，使用查询参数作为最终日期
    sessions = sessions.map(s => ({ 
      ...s, 
      // 使用查询参数作为最终日期，确保前端显示正确的日期
      study_date: date,
      // 修复时间格式，去掉秒数部分
      start_time_new: s.start_time_new ? s.start_time_new.substring(0, 5) : '--:--',
      end_time_new: s.end_time_new ? s.end_time_new.substring(0, 5) : '--:--'
    }));

    console.log('格式化后日期数据:', sessions);

    res.json({
      date,
      sessions,
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
    });

  } catch (error) {
    console.error('获取日期记录错误:', error);
    res.status(500).json({ error: '获取日期记录失败' });
  }
});

// Get single session
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db('study_sessions')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!session) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // 确保返回的日期格式正确
    if (session) {
      session.study_date = typeof session.study_date === 'string' ? session.study_date : 
        session.study_date instanceof Date ? 
          `${session.study_date.getFullYear()}-${String(session.study_date.getMonth() + 1).padStart(2, '0')}-${String(session.study_date.getDate()).padStart(2, '0')}` : 
          session.study_date;
      // 修复时间格式，去掉秒数部分
      session.start_time_new = session.start_time_new ? session.start_time_new.substring(0, 5) : '--:--';
      session.end_time_new = session.end_time_new ? session.end_time_new.substring(0, 5) : '--:--';
    }

    res.json({ session });

  } catch (error) {
    console.error('获取会话详情错误:', error);
    res.status(500).json({ error: '获取会话详情失败' });
  }
});

// Update session
router.put('/:id', authenticateToken, validateSession, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      studyDate,
      projectName,
      startTime,
      endTime,
      duration,
      notes
    } = req.body;

    // Check if session exists and belongs to user
    const existingSession = await db('study_sessions')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!existingSession) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // 根据项目名称查找对应的项目ID
    let projectId = null;
    if (projectName) {
      const project = await db('study_projects')
        .where('user_id', req.user.id)
        .where('name', projectName)
        .first();
      projectId = project ? project.id : null;
    }

    // Update session
    await db('study_sessions')
      .where('id', id)
      .update({
        project_id: projectId, // 更新项目ID
        study_date: studyDate, // 直接使用前端传来的日期字符串
        project_name: projectName,
        start_time_new: startTime,
        end_time_new: endTime,
        start_time: db.raw(`?::date`, [studyDate]), // 使用日期类型，避免时区转换
        end_time: db.raw(`?::date`, [studyDate]), // 使用日期类型，避免时区转换
        duration: duration,
        duration_hours: duration / 60, // 转换为小时
        notes: notes || '',
        updated_at: new Date()
      });

    const updatedSession = await db('study_sessions')
      .where('id', id)
      .first();

    // 确保返回的日期格式正确
    if (updatedSession) {
      updatedSession.study_date = typeof updatedSession.study_date === 'string' ? updatedSession.study_date : 
        updatedSession.study_date instanceof Date ? 
          `${updatedSession.study_date.getFullYear()}-${String(updatedSession.study_date.getMonth() + 1).padStart(2, '0')}-${String(updatedSession.study_date.getDate()).padStart(2, '0')}` : 
          updatedSession.study_date;
      // 修复时间格式，去掉秒数部分
      updatedSession.start_time_new = updatedSession.start_time_new ? updatedSession.start_time_new.substring(0, 5) : '--:--';
      updatedSession.end_time_new = updatedSession.end_time_new ? updatedSession.end_time_new.substring(0, 5) : '--:--';
    }

    res.json({
      message: '学习记录更新成功',
      session: updatedSession
    });

  } catch (error) {
    console.error('更新会话错误:', error);
    res.status(500).json({ error: '更新会话失败' });
  }
});

// Delete session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists and belongs to user
    const session = await db('study_sessions')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!session) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // Delete session
    await db('study_sessions')
      .where('id', id)
      .del();

    res.json({ message: '学习记录删除成功' });

  } catch (error) {
    console.error('删除会话错误:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
});

module.exports = router; 