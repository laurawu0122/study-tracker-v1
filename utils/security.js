const crypto = require('crypto');
const bcrypt = require('bcrypt');
const validator = require('validator');

// 安全配置
const SECURITY_CONFIG = {
    password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true',
        saltRounds: 12
    },
    session: {
        secure: process.env.SESSION_SECURE_COOKIES === 'true',
        httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
        sameSite: process.env.SESSION_SAME_SITE || 'strict'
    },
    rateLimit: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 5
    }
};

// 密码验证
function validatePassword(password) {
    const errors = [];

    if (!password || password.length < SECURITY_CONFIG.password.minLength) {
        errors.push(`密码长度至少为${SECURITY_CONFIG.password.minLength}个字符`);
    }

    if (SECURITY_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('密码必须包含至少一个大写字母');
    }

    if (SECURITY_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('密码必须包含至少一个小写字母');
    }

    if (SECURITY_CONFIG.password.requireNumbers && !/\d/.test(password)) {
        errors.push('密码必须包含至少一个数字');
    }

    if (SECURITY_CONFIG.password.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('密码必须包含至少一个特殊字符');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// 密码哈希
async function hashPassword(password) {
    try {
        return await bcrypt.hash(password, SECURITY_CONFIG.password.saltRounds);
    } catch (error) {
        console.error('密码哈希失败:', error);
        throw new Error('密码加密失败');
    }
}

// 密码验证
async function comparePassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('密码验证失败:', error);
        return false;
    }
}

// 输入清理和验证
function sanitizeInput(input, type = 'string') {
    if (!input) return input;

    switch (type) {
        case 'string':
            return validator.escape(validator.trim(input));
        case 'email':
            return validator.normalizeEmail(validator.trim(input));
        case 'url':
            return validator.trim(input);
        case 'number':
            return validator.toInt(input) || 0;
        case 'boolean':
            return validator.toBoolean(input);
        default:
            return validator.escape(validator.trim(input));
    }
}

// 验证邮箱格式
function validateEmail(email) {
    return validator.isEmail(email);
}

// 验证用户名格式
function validateUsername(username) {
    // 用户名规则：3-20个字符，只能包含字母、数字、下划线
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// 生成安全的随机字符串
function generateSecureRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// 生成安全的随机数字
function generateSecureRandomNumber(min = 100000, max = 999999) {
    const range = max - min + 1;
    const bytes = crypto.randomBytes(4);
    const value = bytes.readUInt32BE(0);
    return min + (value % range);
}

// 生成验证码
function generateVerificationCode(length = 6) {
    return generateSecureRandomNumber(
        Math.pow(10, length - 1),
        Math.pow(10, length) - 1
    ).toString();
}

// 安全日志记录
function logSecurityEvent(event, details = {}, req = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.headers?.['user-agent'] || 'unknown',
        userId: req?.user?.id || 'anonymous'
    };

    if (process.env.LOG_SECURITY_EVENTS === 'true') {
        console.log('🔒 安全事件:', JSON.stringify(logEntry, null, 2));
    }

    // 在生产环境中，这里应该将安全事件记录到专门的日志文件或数据库
    return logEntry;
}

// 检查IP地址是否被锁定
const lockedIPs = new Map();

function isIPLocked(ip, username = null) {
    // 管理员账号永不被锁定
    if (username === 'admin') {
        return false;
    }
    
    const lockInfo = lockedIPs.get(ip);
    if (!lockInfo) return false;

    const now = Date.now();
    if (now > lockInfo.expiresAt) {
        lockedIPs.delete(ip);
        return false;
    }

    return true;
}

// 记录登录失败
function recordLoginFailure(ip, username = null) {
    // 管理员账号永不记录失败
    if (username === 'admin') {
        return;
    }
    
    const now = Date.now();
    const lockInfo = lockedIPs.get(ip) || { count: 0, expiresAt: now + (SECURITY_CONFIG.rateLimit.lockoutDuration * 60 * 1000) };
    
    lockInfo.count++;
    
    if (lockInfo.count >= SECURITY_CONFIG.rateLimit.maxLoginAttempts) {
        lockInfo.expiresAt = now + (SECURITY_CONFIG.rateLimit.lockoutDuration * 60 * 1000);
    }
    
    lockedIPs.set(ip, lockInfo);
}

// 清除登录失败记录
function clearLoginFailures(ip) {
    lockedIPs.delete(ip);
}

// 获取剩余锁定时间
function getRemainingLockoutTime(ip) {
    const lockInfo = lockedIPs.get(ip);
    if (!lockInfo) return 0;

    const now = Date.now();
    if (now > lockInfo.expiresAt) {
        lockedIPs.delete(ip);
        return 0;
    }

    return Math.ceil((lockInfo.expiresAt - now) / 1000 / 60); // 返回分钟数
}

// 验证文件类型
function validateFileType(file, allowedTypes) {
    if (!file || !file.mimetype) return false;
    
    const types = allowedTypes.split(',').map(type => type.trim());
    return types.includes(file.mimetype);
}

// 验证文件大小
function validateFileSize(file, maxSize) {
    if (!file || !file.size) return false;
    return file.size <= maxSize;
}

// 生成CSRF令牌
function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 验证CSRF令牌
function validateCSRFToken(token, storedToken) {
    if (!token || !storedToken) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}

// 清理过期的锁定记录
function cleanupLockedIPs() {
    const now = Date.now();
    for (const [ip, lockInfo] of lockedIPs.entries()) {
        if (now > lockInfo.expiresAt) {
            lockedIPs.delete(ip);
        }
    }
}

// 定期清理锁定记录
setInterval(cleanupLockedIPs, 5 * 60 * 1000); // 每5分钟清理一次

// 安全头部配置
function getSecurityHeaders() {
    return {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
    };
}

module.exports = {
    SECURITY_CONFIG,
    validatePassword,
    hashPassword,
    comparePassword,
    sanitizeInput,
    validateEmail,
    validateUsername,
    generateSecureRandomString,
    generateSecureRandomNumber,
    generateVerificationCode,
    logSecurityEvent,
    isIPLocked,
    recordLoginFailure,
    clearLoginFailures,
    getRemainingLockoutTime,
    validateFileType,
    validateFileSize,
    generateCSRFToken,
    validateCSRFToken,
    getSecurityHeaders,
    lockedIPs
}; 