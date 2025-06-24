// Vercel部署测试文件
// 用于诊断500错误问题

const express = require('express');
const app = express();

// 基本中间件
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 测试路由
app.get('/', (req, res) => {
    try {
        res.json({
            message: 'Vercel测试成功',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            platform: process.env.VERCEL ? 'vercel' : 'unknown',
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL,
                PORT: process.env.PORT
            }
        });
    } catch (error) {
        console.error('根路径错误:', error);
        res.status(500).json({
            error: '根路径处理错误',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/test', (req, res) => {
    try {
        res.json({
            message: '测试端点工作正常',
            timestamp: new Date().toISOString(),
            headers: req.headers,
            url: req.url
        });
    } catch (error) {
        console.error('测试端点错误:', error);
        res.status(500).json({
            error: '测试端点错误',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    try {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            platform: process.env.VERCEL ? 'vercel' : 'unknown'
        });
    } catch (error) {
        console.error('健康检查错误:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 调试端点
app.get('/debug', (req, res) => {
    try {
        res.json({
            message: 'Debug endpoint working',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            platform: process.env.VERCEL ? 'vercel' : 'unknown',
            request: {
                url: req.url,
                method: req.method,
                headers: req.headers,
                ip: req.ip
            },
            process: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            }
        });
    } catch (error) {
        console.error('调试端点错误:', error);
        res.status(500).json({
            error: '调试端点错误',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: '页面未找到',
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('测试服务器错误:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
        error: '测试服务器错误',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

try {
    app.listen(PORT, () => {
        console.log(`测试服务器运行在端口 ${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`平台: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
        console.log(`Node版本: ${process.version}`);
        console.log(`启动时间: ${new Date().toISOString()}`);
    });
} catch (error) {
    console.error('启动测试服务器失败:', error);
    process.exit(1);
}

// 添加未捕获异常处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    console.error('Promise:', promise);
});

module.exports = app; 