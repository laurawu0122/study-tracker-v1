const express = require('express');
const { db } = require('../database/db');
const moment = require('moment');

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

// 获取分析概览数据
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 基础统计
    const stats = await getBasicStats(userId);
    
    // 项目完成趋势（最近6个月）
    const completionTrend = await getCompletionTrend(userId);
    
    // 分类分布
    const categoryDistribution = await getCategoryDistribution(userId);
    
    // 难度分布
    const difficultyDistribution = await getDifficultyDistribution(userId);
    
    // 月度学习时长
    const monthlyHours = await getMonthlyHours(userId);

    res.json({
      stats,
      completionTrend,
      categoryDistribution,
      difficultyDistribution,
      monthlyHours
    });

  } catch (error) {
    console.error('获取分析数据错误:', error);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

// 获取基础统计
async function getBasicStats(userId) {
  const projects = await db('study_projects')
    .where('user_id', userId)
    .select('*');

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  
  const totalHours = projects.reduce((sum, p) => sum + (p.actual_hours || 0), 0);
  
  // 计算平均效率（实际时间 vs 预计时间）
  const efficiencyProjects = projects.filter(p => p.estimated_hours && p.actual_hours);
  const avgEfficiency = efficiencyProjects.length > 0 
    ? Math.round(efficiencyProjects.reduce((sum, p) => {
        const efficiency = (p.estimated_hours / p.actual_hours) * 100;
        return sum + Math.min(efficiency, 200); // 限制在200%以内
      }, 0) / efficiencyProjects.length)
    : 0;

  return {
    totalProjects,
    completedProjects,
    completionRate,
    totalHours: Math.round(totalHours * 10) / 10,
    avgEfficiency
  };
}

// 获取完成趋势
async function getCompletionTrend(userId) {
  const months = [];
  const now = moment();
  
  // 生成最近6个月的月份
  for (let i = 5; i >= 0; i--) {
    const month = moment().subtract(i, 'months');
    months.push({
      month: month.format('YYYY-MM'),
      label: month.format('MM月'),
      completed: 0
    });
  }

  // 查询完成的项目
  const completedProjects = await db('study_projects')
    .where('user_id', userId)
    .where('status', 'completed')
    .select('completion_date')
    .whereNotNull('completion_date');

  // 统计每月完成数量
  completedProjects.forEach(project => {
    const monthKey = moment(project.completion_date).format('YYYY-MM');
    const monthData = months.find(m => m.month === monthKey);
    if (monthData) {
      monthData.completed++;
    }
  });

  return months.map(m => ({ month: m.label, completed: m.completed }));
}

// 获取分类分布
async function getCategoryDistribution(userId) {
  const categories = await db('study_projects')
    .where('user_id', userId)
    .select('category')
    .count('* as count')
    .groupBy('study_projects.name', 'study_sessions.project_name');

  const categoryMap = {
    'programming': '编程',
    'language': '语言学习',
    'design': '设计',
    'business': '商业',
    'other': '其他'
  };

  return categories.map(cat => ({
    category: categoryMap[cat.category] || cat.category,
    count: parseInt(cat.count)
  }));
}

// 获取难度分布
async function getDifficultyDistribution(userId) {
  const difficulties = await db('study_projects')
    .where('user_id', userId)
    .select('difficulty_level')
    .count('* as count')
    .groupBy('study_projects.name', 'study_sessions.project_name');

  return difficulties.map(diff => ({
    level: diff.difficulty_level,
    count: parseInt(diff.count)
  }));
}

// 获取月度学习时长
async function getMonthlyHours(userId) {
  const months = [];
  const now = moment();
  
  // 生成最近6个月的月份
  for (let i = 5; i >= 0; i--) {
    const month = moment().subtract(i, 'months');
    months.push({
      month: month.format('YYYY-MM'),
      label: month.format('MM月'),
      hours: 0
    });
  }

  // 查询学习会话数据
  const sessions = await db('study_sessions')
    .where('user_id', userId)
    .whereNotNull('end_time')
    .select('start_time', 'end_time');

  // 计算每月学习时长
  sessions.forEach(session => {
    const start = moment(session.start_time);
    const end = moment(session.end_time);
    const duration = end.diff(start, 'hours', true);
    
    const monthKey = start.format('YYYY-MM');
    const monthData = months.find(m => m.month === monthKey);
    if (monthData) {
      monthData.hours += duration;
    }
  });

  return months.map(m => ({ 
    month: m.label, 
    hours: Math.round(m.hours * 10) / 10 
  }));
}

// 获取生产力趋势
router.get('/productivity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    let productivityData;
    if (period === 'week') {
      productivityData = await getWeeklyProductivity(userId);
    } else if (period === 'month') {
      productivityData = await getMonthlyProductivity(userId);
    } else {
      productivityData = await getDailyProductivity(userId);
    }

    res.json({ productivityData });

  } catch (error) {
    console.error('获取生产力数据错误:', error);
    res.status(500).json({ error: '获取生产力数据失败' });
  }
});

// 获取每日生产力
async function getDailyProductivity(userId) {
  const days = [];
  const now = moment();
  
  // 生成最近7天
  for (let i = 6; i >= 0; i--) {
    const day = moment().subtract(i, 'days');
    days.push({
      date: day.format('YYYY-MM-DD'),
      label: day.format('MM/DD'),
      hours: 0,
      projects: 0
    });
  }

  // 查询学习会话
  const sessions = await db('study_sessions')
    .where('user_id', userId)
    .whereNotNull('end_time')
    .where('start_time', '>=', moment().subtract(7, 'days').format('YYYY-MM-DD'))
    .select('*');

  // 统计每日学习时长和项目数
  sessions.forEach(session => {
    const start = moment(session.start_time);
    const end = moment(session.end_time);
    const duration = end.diff(start, 'hours', true);
    
    const dateKey = start.format('YYYY-MM-DD');
    const dayData = days.find(d => d.date === dateKey);
    if (dayData) {
      dayData.hours += duration;
      dayData.projects++;
    }
  });

  return days.map(d => ({ 
    date: d.label, 
    hours: Math.round(d.hours * 10) / 10,
    projects: d.projects
  }));
}

// 获取每周生产力
async function getWeeklyProductivity(userId) {
  const weeks = [];
  const now = moment();
  
  // 生成最近8周
  for (let i = 7; i >= 0; i--) {
    const week = moment().subtract(i, 'weeks');
    weeks.push({
      week: week.format('YYYY-[W]WW'),
      label: `第${week.week()}周`,
      hours: 0,
      projects: 0
    });
  }

  // 查询学习会话
  const sessions = await db('study_sessions')
    .where('user_id', userId)
    .whereNotNull('end_time')
    .where('start_time', '>=', moment().subtract(8, 'weeks').format('YYYY-MM-DD'))
    .select('*');

  // 统计每周学习时长和项目数
  sessions.forEach(session => {
    const start = moment(session.start_time);
    const duration = moment(session.end_time).diff(start, 'hours', true);
    
    const weekKey = start.format('YYYY-[W]WW');
    const weekData = weeks.find(w => w.week === weekKey);
    if (weekData) {
      weekData.hours += duration;
      weekData.projects++;
    }
  });

  return weeks.map(w => ({ 
    week: w.label, 
    hours: Math.round(w.hours * 10) / 10,
    projects: w.projects
  }));
}

// 获取每月生产力
async function getMonthlyProductivity(userId) {
  const months = [];
  const now = moment();
  
  // 生成最近6个月
  for (let i = 5; i >= 0; i--) {
    const month = moment().subtract(i, 'months');
    months.push({
      month: month.format('YYYY-MM'),
      label: month.format('MM月'),
      hours: 0,
      projects: 0
    });
  }

  // 查询学习会话
  const sessions = await db('study_sessions')
    .where('user_id', userId)
    .whereNotNull('end_time')
    .where('start_time', '>=', moment().subtract(6, 'months').format('YYYY-MM-DD'))
    .select('*');

  // 统计每月学习时长和项目数
  sessions.forEach(session => {
    const start = moment(session.start_time);
    const duration = moment(session.end_time).diff(start, 'hours', true);
    
    const monthKey = start.format('YYYY-MM');
    const monthData = months.find(m => m.month === monthKey);
    if (monthData) {
      monthData.hours += duration;
      monthData.projects++;
    }
  });

  return months.map(m => ({ 
    month: m.label, 
    hours: Math.round(m.hours * 10) / 10,
    projects: m.projects
  }));
}

module.exports = router; 