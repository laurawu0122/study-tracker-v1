const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 安全配置
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

// Token黑名单（在生产环境中应该使用Redis）
const tokenBlacklist = new Set();

// 安全配置
const JWT_CONFIG = {
    accessToken: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m', // 15分钟
        algorithm: 'HS256'
    },
    refreshToken: {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d', // 7天
        algorithm: 'HS256'
    }
};

// 生成安全的随机密钥
function generateSecureSecret() {
    return crypto.randomBytes(64).toString('hex');
}

// 验证token格式
function validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    // 检查JWT格式 (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }
    
    // 检查每个部分是否为base64编码
    try {
        parts.forEach(part => {
            Buffer.from(part, 'base64');
        });
        return true;
    } catch (error) {
        return false;
    }
}

// 主要认证中间件
function authenticateToken(req, res, next) {
    try {
        // 优先从 cookie 读取 token，然后从 Authorization header
        const token = req.cookies && req.cookies.token
            ? req.cookies.token
            : (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(401).json({ 
                error: '访问令牌缺失',
                code: 'TOKEN_MISSING'
            });
        }

        // 验证token格式
        if (!validateTokenFormat(token)) {
            return res.status(401).json({ 
                error: '访问令牌格式无效',
                code: 'TOKEN_INVALID_FORMAT'
            });
        }

        // 检查token是否在黑名单中
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({ 
                error: '访问令牌已失效',
                code: 'TOKEN_BLACKLISTED'
            });
        }

        jwt.verify(token, JWT_SECRET, JWT_CONFIG.accessToken.algorithm, (err, decoded) => {
            if (err) {
                let errorMessage = '访问令牌无效';
                let errorCode = 'TOKEN_INVALID';
                
                if (err.name === 'TokenExpiredError') {
                    errorMessage = '访问令牌已过期';
                    errorCode = 'TOKEN_EXPIRED';
                } else if (err.name === 'JsonWebTokenError') {
                    errorMessage = '访问令牌签名无效';
                    errorCode = 'TOKEN_SIGNATURE_INVALID';
                }
                
                return res.status(401).json({ 
                    error: errorMessage,
                    code: errorCode
                });
            }

            // 验证token内容
            if (!decoded.userId || !decoded.username || !decoded.role) {
                return res.status(401).json({ 
                    error: '访问令牌内容无效',
                    code: 'TOKEN_PAYLOAD_INVALID'
                });
            }

            // 添加token信息到请求对象
            req.user = {
                id: decoded.userId,
                username: decoded.username,
                role: decoded.role,
                tokenId: decoded.jti, // JWT ID
                issuedAt: decoded.iat,
                expiresAt: decoded.exp
            };

            // 添加token到请求对象（用于后续操作）
            req.token = token;

            next();
        });
    } catch (error) {
        console.error('Token认证错误:', error);
        return res.status(500).json({ 
            error: '认证服务错误',
            code: 'AUTH_SERVICE_ERROR'
        });
    }
}

// 刷新token中间件
function authenticateRefreshToken(req, res, next) {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ 
                error: '刷新令牌缺失',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }

        jwt.verify(refreshToken, JWT_REFRESH_SECRET, JWT_CONFIG.refreshToken.algorithm, (err, decoded) => {
            if (err) {
                return res.status(401).json({ 
                    error: '刷新令牌无效或已过期',
                    code: 'REFRESH_TOKEN_INVALID'
                });
            }

            req.refreshToken = refreshToken;
            req.refreshTokenData = decoded;
            next();
        });
    } catch (error) {
        console.error('刷新token认证错误:', error);
        return res.status(500).json({ 
            error: '认证服务错误',
            code: 'AUTH_SERVICE_ERROR'
        });
    }
}

// 管理员权限中间件
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: '需要管理员权限',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
}

// 生成访问token
function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        jti: crypto.randomBytes(16).toString('hex'), // JWT ID
        type: 'access'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_CONFIG.accessToken.expiresIn,
        algorithm: JWT_CONFIG.accessToken.algorithm
    });
}

// 生成刷新token
function generateRefreshToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        jti: crypto.randomBytes(16).toString('hex'),
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_CONFIG.refreshToken.expiresIn,
        algorithm: JWT_CONFIG.refreshToken.algorithm
    });
}

// 生成token对
function generateTokenPair(user) {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
        accessToken,
        refreshToken,
        expiresIn: JWT_CONFIG.accessToken.expiresIn
    };
}

// 将token加入黑名单
function blacklistToken(token) {
    if (token) {
        tokenBlacklist.add(token);
        
        // 在生产环境中，应该将黑名单存储到Redis或数据库中
        // 这里简单实现，实际项目中需要持久化存储
        setTimeout(() => {
            tokenBlacklist.delete(token);
        }, 24 * 60 * 60 * 1000); // 24小时后自动清理
    }
}

// 登出中间件
function logout(req, res, next) {
    try {
        const token = req.token;
        if (token) {
            blacklistToken(token);
        }
        next();
    } catch (error) {
        console.error('登出错误:', error);
        next();
    }
}

// 安全头部中间件
function addSecurityHeaders(req, res, next) {
    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'DENY');
    
    // 防止MIME类型嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS保护
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // 引用策略
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 权限策略
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
}

// 验证token强度
function validateTokenStrength(token) {
    if (!token || token.length < 100) {
        return false;
    }
    return true;
}

// 清理过期的黑名单token（定期执行）
function cleanupBlacklist() {
    // 这里可以实现清理逻辑
    // 在生产环境中，应该使用Redis的TTL功能
    console.log('清理token黑名单...');
}

// 设置定期清理任务
setInterval(cleanupBlacklist, 60 * 60 * 1000); // 每小时清理一次

module.exports = {
    authenticateToken,
    authenticateRefreshToken,
    requireAdmin,
    adminMiddleware: requireAdmin,
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    blacklistToken,
    logout,
    addSecurityHeaders,
    validateTokenFormat,
    validateTokenStrength,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    JWT_CONFIG,
    generateSecureSecret
}; 