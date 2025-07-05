const express = require('express');
const { db } = require('../database/db');

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

// Get all notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unread } = req.query;
    const offset = (page - 1) * limit;

    let query = db('notifications')
      .where('user_id', req.user.id);

    // 过滤条件
    if (type && type !== 'all') {
      query = query.where('type', type);
    }
    if (unread === 'true') {
      query = query.where('read', false);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ total }] = await totalQuery.count('* as total');

    // Get paginated results
    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取通知列表错误:', error);
    res.status(500).json({ error: '获取通知列表失败' });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count by type
    const stats = await db('notifications')
      .where('user_id', userId)
      .select('type')
      .count('* as count')
      .groupBy('type');

    // Unread count
    const [{ unreadCount }] = await db('notifications')
      .where('user_id', userId)
      .where('read', false)
      .count('* as unreadCount');

    // Total count
    const [{ totalCount }] = await db('notifications')
      .where('user_id', userId)
      .count('* as totalCount');

    // Today's count
    const today = new Date().toISOString().split('T')[0];
    const [{ todayCount }] = await db('notifications')
      .where('user_id', userId)
      .whereRaw('DATE(created_at) = ?', [today])
      .count('* as todayCount');

    const result = {
      urgent: 0,
      upcoming: 0,
      info: 0,
      success: 0,
      warning: 0,
      unread: unreadCount || 0,
      total: totalCount || 0,
      today: todayCount || 0
    };

    stats.forEach(stat => {
      result[stat.type] = parseInt(stat.count);
    });

    res.json(result);

  } catch (error) {
    console.error('获取通知统计错误:', error);
    res.status(500).json({ error: '获取通知统计失败' });
  }
});

// Get unread notification count for badge
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get unread count
    const [{ unreadCount }] = await db('notifications')
      .where('user_id', userId)
      .where('read', false)
      .count('* as unreadCount');

    // Get latest notification timestamp
    const latestNotification = await db('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .first()
      .select('created_at');

    res.json({
      success: true,
      data: {
        unreadCount: parseInt(unreadCount) || 0,
        latestTimestamp: latestNotification?.created_at || null
      }
    });

  } catch (error) {
    console.error('获取未读通知数量错误:', error);
    res.status(500).json({ 
      success: false,
      error: '获取未读通知数量失败' 
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db('notifications')
      .where('id', id)
      .where('user_id', req.user.id)
      .update({
        read: true,
        updated_at: new Date()
      });

    if (result === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json({ message: '通知已标记为已读' });

  } catch (error) {
    console.error('标记通知已读错误:', error);
    res.status(500).json({ error: '标记通知已读失败' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await db('notifications')
      .where('user_id', req.user.id)
      .where('read', false)
      .update({
        read: true,
        updated_at: new Date()
      });

    res.json({ message: '所有通知已标记为已读' });

  } catch (error) {
    console.error('标记所有通知已读错误:', error);
    res.status(500).json({ error: '标记所有通知已读失败' });
  }
});

// Clear all notifications - 必须放在 /:id 路由之前
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    console.log('清除所有通知请求，用户ID:', req.user.id);
    
    const result = await db('notifications')
      .where('user_id', req.user.id)
      .del();

    console.log('清除结果:', result, '条记录被删除');

    res.json({ message: '所有通知已清除' });

  } catch (error) {
    console.error('清除所有通知错误:', error);
    res.status(500).json({ error: '清除所有通知失败' });
  }
});

// Delete notification - 必须放在 /clear-all 路由之后
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db('notifications')
      .where('id', id)
      .where('user_id', req.user.id)
      .del();

    if (result === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json({ message: '通知已删除' });

  } catch (error) {
    console.error('删除通知错误:', error);
    res.status(500).json({ error: '删除通知失败' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await db('notification_settings')
      .where('user_id', req.user.id)
      .first();

    if (!settings) {
      // Create default settings
      const [result] = await db('notification_settings').insert({
        user_id: req.user.id,
        project_reminders: true,
        progress_reminders: true,
        study_goals: true,
        weekly_reports: true,
        email_notifications: false,
        browser_notifications: true,
        daily_reminder_time: '09:00',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      const settingId = result.id;

      const newSettings = await db('notification_settings')
        .where('id', settingId)
        .first();

      res.json(newSettings);
    } else {
      res.json(settings);
    }

  } catch (error) {
    console.error('获取通知设置错误:', error);
    res.status(500).json({ error: '获取通知设置失败' });
  }
});

// Update notification settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const {
      project_reminders,
      progress_reminders,
      study_goals,
      weekly_reports,
      email_notifications,
      browser_notifications,
      daily_reminder_time
    } = req.body;

    const settings = await db('notification_settings')
      .where('user_id', req.user.id)
      .first();

    if (settings) {
      // Update existing settings
      await db('notification_settings')
        .where('user_id', req.user.id)
        .update({
          project_reminders: project_reminders || false,
          progress_reminders: progress_reminders || false,
          study_goals: study_goals || false,
          weekly_reports: weekly_reports || false,
          email_notifications: email_notifications || false,
          browser_notifications: browser_notifications || false,
          daily_reminder_time: daily_reminder_time || '09:00',
          updated_at: new Date()
        });
    } else {
      // Create new settings
      const [result] = await db('notification_settings').insert({
        user_id: req.user.id,
        project_reminders: project_reminders || false,
        progress_reminders: progress_reminders || false,
        study_goals: study_goals || false,
        weekly_reports: weekly_reports || false,
        email_notifications: email_notifications || false,
        browser_notifications: browser_notifications || false,
        daily_reminder_time: daily_reminder_time || '09:00',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
    }

    const updatedSettings = await db('notification_settings')
      .where('user_id', req.user.id)
      .first();

    res.json(updatedSettings);

  } catch (error) {
    console.error('更新通知设置错误:', error);
    res.status(500).json({ error: '更新通知设置失败' });
  }
});

// Get learning insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取最近7天的学习数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await db('study_sessions')
      .where('user_id', userId)
      .where('created_at', '>=', sevenDaysAgo)
      .select('*');

    // 计算学习时长
    const totalMinutes = recentSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageMinutes = recentSessions.length > 0 ? Math.round(totalMinutes / recentSessions.length) : 0;

    // 获取最常学习的项目
    const projectStats = {};
    recentSessions.forEach(session => {
      const project = session.project_name;
      if (!projectStats[project]) {
        projectStats[project] = { count: 0, totalMinutes: 0 };
      }
      projectStats[project].count++;
      projectStats[project].totalMinutes += session.duration || 0;
    });

    const topProject = Object.entries(projectStats)
      .sort(([,a], [,b]) => b.totalMinutes - a.totalMinutes)[0];

    // 生成洞察和建议
    const insights = [];

    if (recentSessions.length === 0) {
      insights.push({
        type: 'warning',
        title: '开始学习之旅',
        message: '您还没有学习记录，建议制定学习计划并开始记录学习时间。',
        action: '开始学习'
      });
    } else if (totalMinutes < 300) { // 少于5小时
      insights.push({
        type: 'info',
        title: '增加学习时间',
        message: `本周您学习了 ${totalMinutes} 分钟，建议每天至少学习1小时。`,
        action: '查看学习计划'
      });
    } else {
      insights.push({
        type: 'success',
        title: '学习表现优秀',
        message: `本周您学习了 ${totalMinutes} 分钟，平均每天 ${averageMinutes} 分钟，继续保持！`,
        action: '查看统计'
      });
    }

    if (topProject) {
      insights.push({
        type: 'info',
        title: '专注领域',
        message: `您最常学习的是"${topProject[0]}"，已投入 ${topProject[1].totalMinutes} 分钟。`,
        action: '查看详情'
      });
    }

    res.json({
      insights,
      stats: {
        totalMinutes,
        averageMinutes,
        sessionCount: recentSessions.length,
        topProject: topProject ? topProject[0] : null
      }
    });

  } catch (error) {
    console.error('获取学习洞察错误:', error);
    res.status(500).json({ error: '获取学习洞察失败' });
  }
});

// Create notification helper function
async function createNotification(userId, type, title, message, data = {}) {
  try {
    const [result] = await db('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: JSON.stringify(data),
      read: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    // 记录新通知创建，用于前端轮询检测
    console.log(`新通知已创建: 用户ID=${userId}, 类型=${type}, 标题=${title}`);

    return result.id;
  } catch (error) {
    console.error('创建通知错误:', error);
    throw error;
  }
}

// Check for project deadlines and create notifications

// Manual trigger reminders
router.post('/trigger-reminders', authenticateToken, async (req, res) => {
  try {
    const studyRemindersService = require('../services/study-reminders');
    
    // 运行所有提醒检查
    await studyRemindersService.runAllReminders(req.user.id);
    
    res.json({
      success: true,
      message: '提醒检查已完成'
    });
  } catch (error) {
    console.error('手动触发提醒失败:', error);
    res.status(500).json({ error: '触发提醒失败' });
  }
});

// Get reminder status
router.get('/reminder-status', authenticateToken, async (req, res) => {
  try {
    const studyRemindersService = require('../services/study-reminders');
    
    // 获取连续学习天数
    const consecutiveDays = await studyRemindersService.getUserConsecutiveDays(req.user.id);
    
    // 获取今日学习时长
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = await db('study_sessions')
      .where('user_id', req.user.id)
      .where('study_date', today)
      .sum('duration as total_duration');
    
    const todayMinutes = todaySessions[0]?.total_duration || 0;
    const todayHours = todayMinutes / 60;
    
    // 获取即将到期的项目
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const upcomingProjects = await db('study_projects')
      .where('user_id', req.user.id)
      .where('status', '!=', 'completed')
      .whereNotNull('completion_date')
      .where('completion_date', '<=', tomorrow.toISOString().split('T')[0])
      .select('id', 'name', 'completion_date');
    
    res.json({
      consecutiveDays,
      todayHours: Math.round(todayHours * 10) / 10,
      upcomingProjects: upcomingProjects.length,
      hasReminders: consecutiveDays >= 3 || todayHours >= 1 || upcomingProjects.length > 0
    });
  } catch (error) {
    console.error('获取提醒状态失败:', error);
    res.status(500).json({ error: '获取提醒状态失败' });
  }
});
async function checkProjectDeadlines() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查找即将到期的项目
    const upcomingProjects = await db('study_projects')
      .where('deadline', '>=', today.toISOString().split('T')[0])
      .where('deadline', '<=', tomorrow.toISOString().split('T')[0])
      .where('status', '!=', 'completed');

    for (const project of upcomingProjects) {
      await createNotification(
        project.user_id,
        'upcoming',
        '项目即将到期',
        `项目"${project.name}"将在 ${project.deadline} 到期，请及时完成。`,
        { projectId: project.id, projectName: project.name }
      );
    }
  } catch (error) {
    console.error('检查项目截止日期错误:', error);
  }
}

module.exports = { router, createNotification, checkProjectDeadlines }; 