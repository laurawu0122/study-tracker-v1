// Vercel部署测试文件
// 用于诊断500错误问题

const express = require('express');
const app = express();

// 基本中间件
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
    res.json({
        message: 'Vercel测试成功',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        platform: process.env.VERCEL ? 'vercel' : 'unknown'
    });
});

app.get('/test', (req, res) => {
    res.json({
        message: '测试端点工作正常',
        timestamp: new Date().toISOString()
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('测试服务器错误:', err);
    res.status(500).json({
        error: '测试服务器错误',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`测试服务器运行在端口 ${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`平台: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
});

module.exports = app; 