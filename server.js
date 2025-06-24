const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const https = require('https');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const { initDatabase, initDatabaseSimple } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// 信任代理（用于反向代理环境）
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 更严格的登录限制
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 限制每个IP 15分钟内最多5次登录尝试
    message: '登录尝试过于频繁，请15分钟后再试'
});
app.use('/api/auth/login', loginLimiter);

// 中间件
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 模板下载路由 - 只允许下载特定文件
app.get('/excel_templates/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // 安全检查：只允许下载特定的模板文件
    const allowedFiles = ['学习项目记录示例.xlsx'];
    
    if (!allowedFiles.includes(filename)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }
    
    const filePath = path.join(__dirname, 'excel_templates', filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
    }
    
    // 额外的安全检查：确保文件路径在允许的目录内
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(path.join(__dirname, 'excel_templates'));
    if (!resolvedPath.startsWith(allowedDir)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }
    
    // 设置响应头，兼容中文文件名
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 发送文件
    res.sendFile(filePath);
});

// 静态文件服务 - 根目录优先
app.use(express.static(__dirname)); // 根目录的静态文件服务优先
app.use(express.static(path.join(__dirname, 'public'))); // public目录作为备用

// 根路径处理 - 确保在Vercel环境中正确服务index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查端点
app.get('/health', async (req, res) => {
    try {
        const { checkDatabaseConnection } = require('./database/db');
        await checkDatabaseConnection();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: require('./package.json').version,
            deployment: {
                platform: process.env.VERCEL ? 'vercel' : 
                         process.env.CF_PAGES ? 'cloudflare' : 
                         process.env.DOCKER ? 'docker' : 'unknown'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 调试端点 - 用于诊断Vercel部署问题
app.get('/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        platform: process.env.VERCEL ? 'vercel' : 
                 process.env.CF_PAGES ? 'cloudflare' : 
                 process.env.DOCKER ? 'docker' : 'unknown',
        request: {
            url: req.url,
            method: req.method,
            headers: req.headers,
            ip: req.ip
        }
    });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({ error: '页面未找到' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    // 根据错误类型返回不同的响应
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
            error: '文件大小超出限制',
            details: '文件大小不能超过5MB'
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
            error: '文件上传错误',
            details: '请检查文件格式是否正确'
        });
    }
    
    res.status(500).json({ 
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : '服务器暂时不可用'
    });
});

// 启动服务器
async function startServer() {
    try {
        console.log('开始初始化数据库...');
        console.log('环境变量检查:', {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            JWT_SECRET: process.env.JWT_SECRET ? '已设置' : '未设置',
            PORT: process.env.PORT
        });
        
        // 根据环境选择数据库初始化方式
        if (process.env.VERCEL) {
            await initDatabaseSimple();
        } else {
            await initDatabase();
        }
        console.log('数据库初始化完成');
        
        // 检查是否在Docker环境中需要HTTPS
        if (process.env.NODE_ENV === 'production' && process.env.DOCKER === 'true') {
            const sslOptions = {
                key: fs.readFileSync('./ssl/key.pem'),
                cert: fs.readFileSync('./ssl/cert.pem')
            };
            
            https.createServer(sslOptions, app).listen(PORT, () => {
                console.log(`HTTPS服务器运行在 https://localhost:${PORT}`);
                console.log(`环境: ${process.env.NODE_ENV}`);
                console.log(`部署平台: Docker`);
            });
        } else {
            app.listen(PORT, () => {
                console.log(`服务器运行在 http://localhost:${PORT}`);
                console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
                console.log(`部署平台: ${process.env.VERCEL ? 'Vercel' : 
                           process.env.CF_PAGES ? 'Cloudflare Pages' : 
                           process.env.DOCKER ? 'Docker' : 'Local'}`);
                console.log(`Node版本: ${process.version}`);
                console.log(`启动时间: ${new Date().toISOString()}`);
            });
        }
    } catch (error) {
        console.error('启动服务器失败:', error);
        console.error('错误堆栈:', error.stack);
        
        // 在Vercel环境中，我们需要确保错误被正确记录
        if (process.env.VERCEL) {
            console.error('Vercel环境错误详情:', {
                message: error.message,
                stack: error.stack,
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            });
        }
        
        // 在Vercel环境中，不要立即退出，让函数继续运行
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
}

// 添加未捕获异常处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    console.error('错误堆栈:', error.stack);
    
    if (process.env.VERCEL) {
        console.error('Vercel环境未捕获异常:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    console.error('Promise:', promise);
    
    if (process.env.VERCEL) {
        console.error('Vercel环境未处理Promise拒绝:', {
            reason: reason,
            promise: promise,
            timestamp: new Date().toISOString()
        });
    }
});

startServer(); 