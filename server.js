const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const exphbs = require('express-handlebars');
const moment = require('moment');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const db = require('./database/db');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const sessionRoutes = require('./routes/sessions');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const dataRoutes = require('./routes/data');
const { router: notificationRoutes } = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const achievementRoutes = require('./routes/achievements');
const pointsExchangeRoutes = require('./routes/points-exchange');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// More lenient rate limiter for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP to 2000 requests per windowMs for admin routes
    message: 'Too many admin requests from this IP, please try again later.'
});

// Specific rate limiter for chart data requests
const chartDataLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 chart data requests per minute
    message: 'Too many chart data requests, please try again later.',
    skipSuccessfulRequests: true
});

app.use('/api/', limiter);
app.use('/api/admin', adminLimiter); // Apply more lenient rate limit to admin routes
app.use('/api/sessions/chart-data', chartDataLimiter); // Apply specific rate limit to chart data

// CORS
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Trust proxy for production
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/excel_templates', express.static(path.join(__dirname, 'excel_templates')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads/products')));

// Favicon route
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content response
});

// Handlebars configuration
const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        eq: function(a, b) { return a === b; },
        json: function(obj) { return JSON.stringify(obj); },
        formatDate: function(date, format) {
            return moment(date).format(format);
        },
        formatDuration: function(hours) {
            if (hours < 1) return Math.round(hours * 60) + '分钟';
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return h + '小时' + (m > 0 ? m + '分钟' : '');
        },
        add: function(a, b) { return a + b; },
        subtract: function(a, b) { return a - b; },
        multiply: function(a, b) { return a * b; },
        divide: function(a, b) { return b !== 0 ? a / b : 0; },
        round: function(num) { return Math.round(num); },
        gt: function(a, b) { return a > b; },
        lt: function(a, b) { return a < b; },
        gte: function(a, b) { return a >= b; },
        lte: function(a, b) { return a <= b; }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Global middleware for user data
app.use(async (req, res, next) => {
    try {
        // 优先从 cookie 读取 token
        const token = req.cookies && req.cookies.token
            ? req.cookies.token
            : (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);
        if (token) {
            const user = await db.getUserByToken(token);
            if (user) {
                req.user = user;
                res.locals.user = user;
            }
        }
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        next();
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/points-exchange', pointsExchangeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
    });
});









// Page Routes
app.get('/', async (req, res) => {
    if (req.user) {
        // 已登录用户显示仪表板
        try {
            const stats = await db.getDashboardStats(req.user.id);
            const weeklyData = await db.getWeeklyProgress(req.user.id);
            const recentActivities = await db.getRecentActivities(req.user.id);
            
            res.render('pages/dashboard', {
                title: '仪表板',
                description: '学习进度概览',
                currentPage: 'dashboard',
                pageTitle: '仪表板',
                stats,
                weeklyData,
                recentActivities,
                today: new Date(),
                charts: true
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('pages/error', {
                title: '错误',
                description: '加载仪表板时出错',
                error: '加载数据时出错，请稍后重试'
            });
        }
    } else {
        // 未登录用户显示主页
        res.render('pages/home', {
            title: '学习项目追踪系统',
            description: '现代化学习管理平台，帮助您记录学习进度，分析效率趋势',
            currentPage: 'home',
            layout: false  // 不使用布局，直接渲染主页内容
        });
    }
});



app.get('/dashboard', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，返回仪表板内容
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        try {
            const stats = await db.getDashboardStats(req.user.id);
            const weeklyData = await db.getWeeklyProgress(req.user.id);
            const recentActivities = await db.getRecentActivities(req.user.id);
            
            return res.render('pages/dashboard', {
                title: '仪表板',
                description: '学习进度概览',
                currentPage: 'dashboard',
                pageTitle: '仪表板',
                stats,
                weeklyData,
                recentActivities,
                today: new Date(),
                charts: true,
                layout: false  // 不使用布局，只返回内容
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            return res.status(500).json({ error: '加载数据时出错，请稍后重试' });
        }
    }
    
    // 正常请求，返回欢迎页面（不包含仪表板内容）
    res.render('pages/welcome', {
        title: '欢迎',
        description: '学习追踪系统欢迎页面',
        currentPage: 'welcome',
        pageTitle: '欢迎使用学习追踪系统'
    });
});

app.get('/projects', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/projects', {
            title: '项目管理',
            description: '管理您的学习项目',
            currentPage: 'projects',
            pageTitle: '项目管理',
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/projects', {
        title: '项目管理',
        description: '管理您的学习项目',
        currentPage: 'projects',
        pageTitle: '项目管理'
    });
});

app.get('/sessions', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/sessions', {
            title: '学习记录',
            description: '记录学习时间和进度',
            currentPage: 'sessions',
            pageTitle: '学习记录',
            pageJS: '/assets/js/sessions.js',
            charts: true,
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/sessions', {
        title: '学习记录',
        description: '记录学习时间和进度',
        currentPage: 'sessions',
        pageTitle: '学习记录',
        pageJS: '/assets/js/sessions.js',
        charts: true
    });
});

app.get('/notifications', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/notifications', {
            title: '通知中心',
            description: '查看和管理通知',
            currentPage: 'notifications',
            pageTitle: '通知中心',
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/notifications', {
        title: '通知中心',
        description: '查看和管理通知',
        currentPage: 'notifications',
        pageTitle: '通知中心'
    });
});

app.get('/analytics', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/analytics', {
            title: '数据分析',
            description: '学习趋势和效率分析',
            currentPage: 'analytics',
            pageTitle: '数据分析',
            charts: true,
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/analytics', {
        title: '数据分析',
        description: '学习趋势和效率分析',
        currentPage: 'analytics',
        pageTitle: '数据分析',
        charts: true
    });
});

app.get('/achievements', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/achievements', {
            title: '成就徽章',
            description: '查看学习成就和徽章',
            currentPage: 'achievements',
            pageTitle: '成就徽章',
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/achievements', {
        title: '成就徽章',
        description: '查看学习成就和徽章',
        currentPage: 'achievements',
        pageTitle: '成就徽章'
    });
});

app.get('/admin', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 检查管理员权限
    if (req.user.role !== 'admin') {
        return res.status(403).render('pages/error', {
            title: '权限不足',
            description: '您没有访问此页面的权限',
            error: '需要管理员权限才能访问系统管理页面'
        });
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/admin', {
            title: '系统管理',
            description: '系统管理和配置',
            currentPage: 'admin',
            pageTitle: '系统管理',
            layout: false  // 不使用布局，只返回内容
        });
    }
    
    res.render('pages/admin', {
        title: '系统管理',
        description: '系统管理和配置',
        currentPage: 'admin',
        pageTitle: '系统管理'
    });
});



// 处理admin页面子路由
app.get('/admin/page/:page', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 检查管理员权限
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const { page } = req.params;
    
    try {
        // 根据页面名称返回对应的内容
        switch (page) {
            case 'smtp-config':
                const html = await require('fs').promises.readFile(
                    path.join(__dirname, 'views/admin/smtp-config.hbs'), 'utf8'
                );
                res.send(html);
                break;
            default:
                res.status(404).json({ error: '页面不存在' });
        }
    } catch (error) {
        console.error('加载admin页面失败:', error);
        res.status(500).json({ error: '加载失败' });
    }
});

// 管理端积分兑换页面路由
app.get('/admin/points-exchange', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 检查管理员权限
    if (req.user.role !== 'admin') {
        return res.status(403).render('pages/error', {
            title: '权限不足',
            description: '您没有访问此页面的权限',
            error: '需要管理员权限才能访问积分兑换管理页面'
        });
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        try {
            const html = await require('fs').promises.readFile(
                path.join(__dirname, 'views/admin/points-exchange.hbs'), 'utf8'
            );
            res.send(html);
        } catch (error) {
            console.error('加载积分兑换管理页面失败:', error);
            res.status(500).send('加载失败');
        }
        return;
    }
    
    res.render('pages/admin', {
        title: '积分兑换管理',
        description: '管理虚拟商品和积分规则',
        currentPage: 'admin-points-exchange',
        pageTitle: '积分兑换管理'
    });
});

// 管理端兑换审核页面路由
app.get('/admin/exchange-approval', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    
    // 检查管理员权限
    if (req.user.role !== 'admin') {
        return res.status(403).render('pages/error', {
            title: '权限不足',
            description: '您没有访问此页面的权限',
            error: '需要管理员权限才能访问兑换审核页面'
        });
    }
    
    // 如果是AJAX请求，只返回内容部分
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        try {
            const html = await require('fs').promises.readFile(
                path.join(__dirname, 'views/admin/exchange-approval.hbs'), 'utf8'
            );
            res.send(html);
        } catch (error) {
            console.error('加载兑换审核页面失败:', error);
            res.status(500).send('加载失败');
        }
        return;
    }
    
    res.render('pages/admin', {
        title: '兑换审核',
        description: '审核用户兑换申请',
        currentPage: 'admin-exchange-approval',
        pageTitle: '兑换审核'
    });
});



app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

app.get('/points-exchange', async (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  // 如果是AJAX请求，只返回内容部分
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/points-exchange', {
      layout: false,
      title: '积分兑换',
      description: '用学习积分兑换虚拟商品',
      currentPage: 'points-exchange',
      pageTitle: '积分兑换'
    });
    return;
  }
  res.render('pages/points-exchange', {
    title: '积分兑换',
    description: '用学习积分兑换虚拟商品',
    currentPage: 'points-exchange',
    pageTitle: '积分兑换'
  });
});

app.get('/exchange-records', async (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  // 如果是AJAX请求，只返回内容部分
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/exchange-records', {
      layout: false,
      title: '兑换记录',
      description: '查看兑换历史',
      currentPage: 'exchange-records',
      pageTitle: '兑换记录'
    });
    return;
  }
  res.render('pages/exchange-records', {
    title: '兑换记录',
    description: '查看兑换历史',
    currentPage: 'exchange-records',
    pageTitle: '兑换记录'
  });
});

app.get('/points-records', async (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  // 如果是AJAX请求，只返回内容部分
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/points-records', {
      layout: false,
      title: '积分明细',
      description: '查看积分记录',
      currentPage: 'points-records',
      pageTitle: '积分明细'
    });
    return;
  }
  res.render('pages/points-records', {
    title: '积分明细',
    description: '查看积分记录',
    currentPage: 'points-records',
    pageTitle: '积分明细'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    
    // 如果是API请求，返回JSON错误
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            error: '服务器内部错误',
            message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
        });
    }
    
    // 如果是页面请求，渲染错误页面
    res.status(500).render('pages/error', {
        title: '错误',
        description: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
    });
});



// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: '接口不存在' });
    }
    
    res.status(404).render('pages/error', {
        title: '页面未找到',
        description: '请求的页面不存在',
        error: '404 - 页面未找到'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, async () => {
    try {
        await db.initializeDatabase();
        console.log(`数据库连接成功`);
        console.log(`数据库初始化完成`);
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`部署平台: ${process.env.VERCEL ? 'Vercel' : process.env.DOCKER ? 'Docker' : 'Local'}`);
        
        // 启动定时任务服务
        const scheduler = require('./services/scheduler');
        scheduler.start();
        console.log('定时任务服务已启动');
    } catch (error) {
        console.error('启动失败:', error);
        process.exit(1);
    }
});