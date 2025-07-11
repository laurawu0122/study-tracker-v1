const logger = require('../utils/logger');

/**
 * 统一错误处理中间件
 * 用于捕获和处理应用中的各种错误
 */
function errorHandler(err, req, res, next) {
    // 记录错误信息
    const errorData = {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        user: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    // 根据错误类型记录不同级别的日志
    if (err.status === 404) {
        logger.warn('404错误', errorData);
    } else if (err.status >= 400 && err.status < 500) {
        logger.warn('客户端错误', errorData);
    } else {
        logger.error('服务器错误', errorData);
    }

    // 记录安全相关错误
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        logger.security('数据库连接错误', errorData);
    }

    // 如果是API请求，返回JSON错误
    if (req.path.startsWith('/api/')) {
        const statusCode = err.status || 500;
        const message = process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误';
        
        return res.status(statusCode).json({
            success: false,
            error: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // 如果是页面请求，渲染错误页面
    const statusCode = err.status || 500;
    const errorMessage = process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误';
    
    res.status(statusCode).render('pages/error', {
        title: '错误',
        description: '发生了一个错误',
        error: errorMessage,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获错误
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 性能监控中间件
 * 记录请求处理时间
 */
function performanceMonitor(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        
        // 记录慢请求
        if (duration > 1000) {
            logger.warn('慢请求', {
                url: req.url,
                method: req.method,
                duration: `${duration}ms`,
                statusCode,
                user: req.user?.id
            });
        }
        
        // 记录性能数据
        logger.performance('请求处理', duration, {
            url: req.url,
            method: req.method,
            statusCode,
            user: req.user?.id
        });
    });
    
    next();
}

/**
 * 请求日志中间件
 * 记录所有请求的基本信息
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            user: req.user?.id,
            ip: req.ip
        };
        
        // 根据状态码选择日志级别
        if (res.statusCode >= 400) {
            logger.warn('请求完成', logData);
        } else {
            logger.info('请求完成', logData);
        }
    });
    
    next();
}

module.exports = {
    errorHandler,
    asyncHandler,
    performanceMonitor,
    requestLogger
}; 