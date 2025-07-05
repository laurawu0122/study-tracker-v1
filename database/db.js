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
  getAnalytics
}; 