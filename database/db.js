const knex = require('knex');
const config = require('../knexfile');
const jwt = require('jsonwebtoken');

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

const db = knex(dbConfig);

// Test database connection
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    // Run migrations
    await db.migrate.latest();
    console.log('✅ 数据库迁移完成');
    
    // Run seeds
    await db.seed.run();
    console.log('✅ 数据库种子数据完成');
    
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    return false;
  }
}

// Close database connection
async function closeConnection() {
  try {
    await db.destroy();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error.message);
  }
}

// User methods
async function getUserByToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users').where('id', decoded.userId).first();
    return user;
  } catch (error) {
    return null;
  }
}

async function getUserById(id) {
  return await db('users').where('id', id).first();
}

async function createUser(userData) {
  const [user] = await db('users').insert(userData).returning('*');
  return user;
}

async function updateUser(id, userData) {
  const [user] = await db('users').where('id', id).update(userData).returning('*');
  return user;
}

// Project methods
async function getProjects(userId) {
  return await db('study_projects')
    .where('user_id', userId)
    .orderBy('created_at', 'desc');
}

async function getProjectById(id, userId) {
  return await db('study_projects')
    .where({ id, user_id: userId })
    .first();
}

async function createProject(projectData) {
  const [project] = await db('study_projects').insert(projectData).returning('*');
  return project;
}

async function updateProject(id, projectData, userId) {
  const [project] = await db('study_projects')
    .where({ id, user_id: userId })
    .update(projectData)
    .returning('*');
  return project;
}

async function deleteProject(id, userId) {
  return await db('study_projects')
    .where({ id, user_id: userId })
    .del();
}

// Session methods
async function getSessions(userId) {
  return await db('study_sessions')
    .join('study_projects', 'study_sessions.project_id', 'study_projects.id')
    .where('study_sessions.user_id', userId)
    .select(
      'study_sessions.*',
      'study_projects.name as project_name'
    )
    .orderBy('study_sessions.created_at', 'desc');
}

async function getSessionById(id, userId) {
  return await db('study_sessions')
    .join('study_projects', 'study_sessions.project_id', 'study_projects.id')
    .where({ 'study_sessions.id': id, 'study_sessions.user_id': userId })
    .select(
      'study_sessions.*',
      'study_projects.name as project_name'
    )
    .first();
}

async function createSession(sessionData) {
  const [session] = await db('study_sessions').insert(sessionData).returning('*');
  return session;
}

async function updateSession(id, sessionData, userId) {
  const [session] = await db('study_sessions')
    .where({ id, user_id: userId })
    .update(sessionData)
    .returning('*');
  return session;
}

async function deleteSession(id, userId) {
  return await db('study_sessions')
    .where({ id, user_id: userId })
    .del();
}

// Dashboard methods
async function getDashboardStats(userId) {
  const projects = await db('study_projects').where('user_id', userId);
  const sessions = await db('study_sessions').where('user_id', userId);
  
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const pausedProjects = projects.filter(p => p.status === 'paused').length;
  
  const totalHours = sessions.reduce((sum, session) => sum + (session.duration_hours || 0), 0);
  
  // Calculate average efficiency (simplified)
  const avgEfficiency = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  
  return {
    totalProjects,
    activeProjects,
    completedProjects,
    pausedProjects,
    totalHours,
    avgEfficiency
  };
}

async function getWeeklyProgress(userId) {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const sessions = await db('study_sessions')
    .where('user_id', userId)
    .whereBetween('start_time', [weekStart, weekEnd])
    .select('*');
  
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const data = days.map((day, index) => {
    const dayStart = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= dayStart && sessionDate < dayEnd;
    });
    
    const totalHours = daySessions.reduce((sum, session) => sum + (session.duration_hours || 0), 0);
    
    return {
      label: day,
      data: totalHours
    };
  });

  return data;
}

async function getRecentActivities(userId) {
  return await db('study_sessions')
    .join('study_projects', 'study_sessions.project_id', 'study_projects.id')
    .where('study_sessions.user_id', userId)
    .select(
      'study_sessions.*',
      'study_projects.name as project_name'
    )
    .orderBy('study_sessions.created_at', 'desc')
    .limit(10);
}

async function getAnalytics(userId) {
  const projects = await db('study_projects').where('user_id', userId);
  const sessions = await db('study_sessions').where('user_id', userId);
  
  // 按类别统计项目
  const categoryStats = {};
  projects.forEach(project => {
    const category = project.category || '未分类';
    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, completed: 0 };
    }
    categoryStats[category].count++;
    if (project.status === 'completed') {
      categoryStats[category].completed++;
    }
  });
  
  // 按月份统计学习时间
  const monthlyStats = {};
  sessions.forEach(session => {
    const month = new Date(session.start_time).toISOString().slice(0, 7);
    if (!monthlyStats[month]) {
      monthlyStats[month] = 0;
    }
    monthlyStats[month] += session.duration_hours || 0;
  });
  
  return {
    categoryStats,
    monthlyStats,
    totalProjects: projects.length,
    totalSessions: sessions.length,
    totalHours: sessions.reduce((sum, session) => sum + (session.duration_hours || 0), 0)
  };
}

// Admin methods
async function getAllUsers(includeInactive = false) {
  let query = db('users')
    .select('id', 'username', 'email', 'role', 'is_active', 'avatar', 'created_at', 'last_login_at')
    .orderBy('created_at', 'desc');
  
  // 默认只返回活跃用户，除非明确要求包含非活跃用户
  if (!includeInactive) {
    query = query.where('is_active', true);
  }
  
  const users = await query;
  
  // 获取每个用户的积分信息
  const usersWithPoints = await Promise.all(users.map(async (user) => {
    const userPoints = await db('user_points')
      .where('user_id', user.id)
      .select('total_points', 'available_points', 'used_points')
      .first();
    
    return {
      ...user,
      points: userPoints ? userPoints.available_points : 0,
      total_points: userPoints ? userPoints.total_points : 0,
      used_points: userPoints ? userPoints.used_points : 0
    };
  }));
  
  return usersWithPoints;
}

async function getDataStats() {
  const totalUsers = await db('users').count('* as count').first();
  const totalProjects = await db('study_projects').count('* as count').first();
  const totalSessions = await db('study_sessions').count('* as count').first();
  
  return {
    totalUsers: parseInt(totalUsers.count),
    totalProjects: parseInt(totalProjects.count),
    totalSessions: parseInt(totalSessions.count)
  };
}

async function getAllAchievements() {
  return await db('achievements')
    .select('*')
    .orderBy('created_at', 'desc');
}

async function getSystemConfig() {
  const config = await db('system_config').first();
  return config || {
    systemName: 'Study Tracker',
    systemVersion: '2.0.0',
    adminEmail: 'admin@example.com',
    timezone: 'Asia/Shanghai',
    defaultStudyTime: 30,
    dailyGoal: 120,
    reminderTime: '09:00',
    autoSaveInterval: 60,
    browserNotifications: true,
    studyReminders: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    minPasswordLength: 8,
    backupFrequency: 7,
    debugMode: false,
    maintenanceMode: false
  };
}

async function getExchangeRecords() {
  return await db('exchange_records')
    .join('users', 'exchange_records.user_id', 'users.id')
    .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
    .select(
      'exchange_records.*',
      'users.username as user_username',
      'virtual_products.name as product_name'
    )
    .orderBy('exchange_records.created_at', 'desc');
}

async function getPendingExchangeRecords() {
  return await db('exchange_records')
    .join('users', 'exchange_records.user_id', 'users.id')
    .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
    .where('exchange_records.status', 'pending')
    .select(
      'exchange_records.*',
      'users.username as user_username',
      'virtual_products.name as product_name'
    )
    .orderBy('exchange_records.created_at', 'desc');
}

async function getSMTPConfig() {
  const config = await db('system_config').first();
  return {
    host: config?.smtp_host || '',
    port: config?.smtp_port || 587,
    user: config?.smtp_user || '',
    pass: config?.smtp_pass || '',
    secure: config?.smtp_secure || false
  };
}

async function getAdminStats() {
  const totalUsers = await db('users').count('* as count').first();
  const totalProjects = await db('study_projects').count('* as count').first();
  const totalSessions = await db('study_sessions').count('* as count').first();
  const totalAchievements = await db('achievements').count('* as count').first();
  
  // 计算总学习时间
  const sessions = await db('study_sessions').select('duration_hours');
  const totalHours = sessions.reduce((sum, session) => sum + (session.duration_hours || 0), 0);
  
  return {
    totalUsers: parseInt(totalUsers.count),
    totalProjects: parseInt(totalProjects.count),
    totalSessions: parseInt(totalSessions.count),
    totalAchievements: parseInt(totalAchievements.count),
    totalHours: Math.round(totalHours * 100) / 100
  };
}

module.exports = {
  db,
  knex: db,
  testConnection,
  initializeDatabase,
  closeConnection,
  getUserByToken,
  getUserById,
  createUser,
  updateUser,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getDashboardStats,
  getWeeklyProgress,
  getRecentActivities,
  getAnalytics,
  // Admin functions
  getAllUsers,
  getDataStats,
  getAllAchievements,
  getSystemConfig,
  getExchangeRecords,
  getPendingExchangeRecords,
  getSMTPConfig,
  getAdminStats
}; 