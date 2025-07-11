const express = require('express');
const router = express.Router();

// 引入演示数据
const { demoData } = require('../middleware/demo-mock');

// 演示数据
const demoStats = {
  totalProjects: 3,
  totalStudyTime: 1560,
  totalSessions: 30,
  currentStreak: 7,
  todayStudyTime: 120,
  todaySessions: 2,
  // 可根据主站dashboard.hbs实际需要补充字段
};
const demoWeeklyData = [
  { date: '2025-01-14', time: 120 },
  { date: '2025-01-15', time: 180 },
  { date: '2025-01-16', time: 90 },
  { date: '2025-01-17', time: 150 },
  { date: '2025-01-18', time: 200 },
  { date: '2025-01-19', time: 160 },
  { date: '2025-01-20', time: 140 }
];
const demoRecentActivities = [
  {
    project_name: 'JavaScript 进阶学习',
    notes: '学习了Promise和async/await的使用',
    duration: 45,
    study_date: '2025-01-20 14:30:00'
  },
  {
    project_name: 'JavaScript 进阶学习',
    notes: '深入理解闭包和作用域',
    duration: 60,
    study_date: '2025-01-19 16:00:00'
  },
  {
    project_name: 'Python 数据分析',
    notes: '使用pandas进行数据处理',
    duration: 75,
    study_date: '2025-01-18 10:15:00'
  }
];

function getDemoUser() {
  return {
    id: 'demo_user',
    username: '演示用户',
    email: 'demo@study-tracker.com',
    role: 'demo'
  };
}

function isAjax(req) {
  return req.headers['x-requested-with'] === 'XMLHttpRequest';
}

// 虚拟管理员对象
function getDemoAdmin() {
  return {
    id: 'demo_admin',
    username: '演示管理员',
    email: 'admin@study-tracker.com',
    role: 'admin'
  };
}

// 系统管理页面路由 - 与生产环境保持一致
router.get('/admin', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 系统管理',
    description: '演示模式，仅供体验',
    currentPage: 'admin',
    pageTitle: '系统管理',
    isDemo: true,
    user: getDemoAdmin()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/admin', renderOptions);
});

// 动态渲染管理后台各 tab 页面 - 与生产环境保持一致
router.get('/admin/page/:tab', (req, res) => {
  const tab = req.params.tab;
  const renderOptions = {
    title: `系统演示 - ${getTabTitle(tab)}`,
    description: '演示模式，仅供体验',
    currentPage: `admin-${tab}`,
    pageTitle: getTabTitle(tab),
    isDemo: true,
    user: getDemoAdmin(),
    layout: false
  };
  res.render(`admin/${tab}`, renderOptions);
});

// 获取tab标题的辅助函数
function getTabTitle(tab) {
  const titles = {
    'users': '用户管理',
    'data': '数据管理',
    'achievements': '成就管理',
    'config': '系统配置',
    'data-management': '测试数据',
    'points-exchange': '积分兑换管理',
    'exchange-approval': '兑换审核',
    'smtp-config': 'SMTP 配置',
    'stats': '统计信息'
  };
  return titles[tab] || '未知页面';
}

// 仪表板
router.get(['/', '/dashboard'], (req, res) => {
  const renderOptions = {
    title: '系统演示 - 仪表板',
    description: '演示模式，仅供体验',
    currentPage: 'dashboard',
    pageTitle: '仪表板',
    stats: demoStats,
    weeklyData: demoWeeklyData,
    recentActivities: demoRecentActivities,
    today: new Date(),
    charts: true,
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/dashboard', renderOptions);
});

// 项目管理
router.get('/projects', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 项目管理',
    description: '演示模式，仅供体验',
    currentPage: 'projects',
    pageTitle: '项目管理',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/projects', renderOptions);
});

// 学习记录
router.get('/sessions', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 学习记录',
    description: '演示模式，仅供体验',
    currentPage: 'sessions',
    pageTitle: '学习记录',
    pageJS: '/assets/js/sessions.js',
    charts: true,
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/sessions', renderOptions);
});

// 成就
router.get('/achievements', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 成就系统',
    description: '演示模式，仅供体验',
    currentPage: 'achievements',
    pageTitle: '成就系统',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/achievements', renderOptions);
});

// 积分商城
router.get('/points-exchange', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 积分商城',
    description: '演示模式，仅供体验',
    currentPage: 'points-exchange',
    pageTitle: '积分商城',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/points-exchange', renderOptions);
});

// 兑换记录
router.get('/exchange-records', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 兑换记录',
    description: '演示模式，仅供体验',
    currentPage: 'exchange-records',
    pageTitle: '兑换记录',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/exchange-records', renderOptions);
});

// 积分明细
router.get('/points-records', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 积分记录',
    description: '演示模式，仅供体验',
    currentPage: 'points-records',
    pageTitle: '积分记录',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/points-records', renderOptions);
});

// 通知
router.get('/notifications', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 通知中心',
    description: '演示模式，仅供体验',
    currentPage: 'notifications',
    pageTitle: '通知中心',
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/notifications', renderOptions);
});

// 数据分析
router.get('/analytics', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 数据分析',
    description: '演示模式，仅供体验',
    currentPage: 'analytics',
    pageTitle: '数据分析',
    charts: true,
    isDemo: true,
    user: getDemoUser()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('pages/analytics', renderOptions);
});

// 演示API接口
router.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      user: demoData.user,
      analytics: demoData.analytics,
      recentSessions: demoData.sessions.slice(0, 5),
      recentAchievements: demoData.achievements.slice(0, 3)
    }
  });
});

router.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    data: demoData.projects
  });
});

router.get('/api/sessions', (req, res) => {
  res.json({
    success: true,
    data: demoData.sessions
  });
});

router.get('/api/achievements', (req, res) => {
  res.json({
    success: true,
    data: demoData.achievements
  });
});

router.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: demoData.products
  });
});

router.get('/api/exchange-records', (req, res) => {
  res.json({
    success: true,
    data: demoData.exchangeRecords
  });
});

// 模拟创建学习会话
router.post('/api/sessions', (req, res) => {
  const { project_id, duration, notes } = req.body;
  
  // 模拟创建新会话
  const newSession = {
    id: demoData.sessions.length + 1,
    project_id: parseInt(project_id),
    project_name: demoData.projects.find(p => p.id === parseInt(project_id))?.name || '未知项目',
    duration: parseInt(duration),
    notes: notes || '',
    study_date: new Date().toISOString()
  };
  
  demoData.sessions.unshift(newSession);
  
  res.json({
    success: true,
    message: '学习会话创建成功！',
    data: newSession
  });
});

// 模拟兑换商品
router.post('/api/exchange', (req, res) => {
  const { product_id } = req.body;
  const product = demoData.products.find(p => p.id === parseInt(product_id));
  
  if (!product) {
    return res.status(400).json({
      success: false,
      message: '商品不存在'
    });
  }
  
  if (demoData.user.availablePoints < product.points_required) {
    return res.status(400).json({
      success: false,
      message: '积分不足'
    });
  }
  
  // 模拟兑换
  const newRecord = {
    id: demoData.exchangeRecords.length + 1,
    product_name: product.name,
    points_spent: product.points_required,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  demoData.exchangeRecords.unshift(newRecord);
  demoData.user.availablePoints -= product.points_required;
  demoData.user.usedPoints += product.points_required;
  
  res.json({
    success: true,
    message: '兑换申请提交成功！',
    data: newRecord
  });
});

// 积分兑换管理API路由
router.get('/api/admin/points-exchange', (req, res) => {
  res.json({
    success: true,
    data: {
      products: demoData.products,
      stats: {
        totalProducts: demoData.products.length,
        activeProducts: demoData.products.filter(p => p.status === 'active').length,
        totalExchanges: demoData.exchangeRecords.length
      }
    }
  });
});

// 兑换审核API路由
router.get('/api/admin/exchange-approval', (req, res) => {
  res.json({
    success: true,
    data: {
      records: demoData.exchangeRecords,
      stats: {
        pending: demoData.exchangeRecords.filter(r => r.status === 'pending').length,
        approved: demoData.exchangeRecords.filter(r => r.status === 'approved').length,
        rejected: demoData.exchangeRecords.filter(r => r.status === 'rejected').length,
        total: demoData.exchangeRecords.length
      }
    }
  });
});

// 系统管理页面API路由
router.get('/api/admin/page/:tab', (req, res) => {
  const tab = req.params.tab;
  const renderOptions = {
    title: `系统演示 - ${getTabTitle(tab)}`,
    description: '演示模式，仅供体验',
    currentPage: `admin-${tab}`,
    pageTitle: getTabTitle(tab),
    isDemo: true,
    user: getDemoAdmin(),
    layout: false
  };
  
  // 渲染对应的admin模板
  res.render(`admin/${tab}`, renderOptions);
});

// 特定的管理页面路由 - 确保所有管理功能都能访问
router.get('/admin/points-exchange', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 积分兑换管理',
    description: '演示模式，仅供体验',
    currentPage: 'admin-points-exchange',
    pageTitle: '积分兑换管理',
    isDemo: true,
    user: getDemoAdmin()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('admin/points-exchange', renderOptions);
});

router.get('/admin/exchange-approval', (req, res) => {
  const renderOptions = {
    title: '系统演示 - 兑换审核',
    description: '演示模式，仅供体验',
    currentPage: 'admin-exchange-approval',
    pageTitle: '兑换审核',
    isDemo: true,
    user: getDemoAdmin()
  };
  if (isAjax(req)) renderOptions.layout = false;
  res.render('admin/exchange-approval', renderOptions);
});

module.exports = router; 