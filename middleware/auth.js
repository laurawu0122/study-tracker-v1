const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Token 黑名单存储（在生产环境中应该使用 Redis）
const blacklistedTokens = new Set();

function authenticateToken(req, res, next) {
    // 优先从 cookie 读取 token，然后从 Authorization header
    const token = req.cookies && req.cookies.token
        ? req.cookies.token
        : (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        // 管理员token永远有效
        if (user && (user.username === 'admin' || user.role === 'admin')) {
            req.user = {
                id: user.userId || user.id,
                username: user.username,
                role: user.role
            };
            return next();
        }
        if (err) {
            return res.status(403).json({ error: '访问令牌无效或已过期' });
        }
        req.user = {
            id: user.userId || user.id,
            username: user.username,
            role: user.role
        };
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
}

function generateToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function generateTokenPair(user) {
    const accessToken = jwt.sign(
        { 
            userId: user.id, 
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
    
    const refreshToken = jwt.sign(
        { 
            userId: user.id, 
            username: user.username,
            role: user.role
        },
        process.env.JWT_REFRESH_SECRET || JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
}

function blacklistToken(token) {
    // 将 token 加入黑名单
    if (token) {
        blacklistedTokens.add(token);
        console.log('Token已加入黑名单');
    }
    return true;
}

function isTokenBlacklisted(token) {
    return blacklistedTokens.has(token);
}

function logout(req, res, next) {
    // 登出中间件 - 清除用户信息
    req.user = null;
    next();
}

function addSecurityHeaders(req, res, next) {
    // 添加安全头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
}

// 别名函数，保持向后兼容
const authMiddleware = authenticateToken;
const adminMiddleware = requireAdmin;

module.exports = {
    authenticateToken,
    requireAdmin,
    generateToken,
    generateTokenPair,
    blacklistToken,
    isTokenBlacklisted,
    logout,
    addSecurityHeaders,
    authMiddleware,
    adminMiddleware,
    JWT_SECRET
}; 