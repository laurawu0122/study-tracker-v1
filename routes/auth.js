const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db, getUserByToken, getUserById, createUser, updateUser } = require('../database/db');
const { 
    sendVerificationEmail, 
    generateVerificationCode, 
    storeVerificationCode, 
    verifyCode, 
    isEmailRegistered,
    validateEmailConfig 
} = require('../services/email');
const { 
    authenticateToken, 
    generateTokenPair, 
    blacklistToken,
    logout,
    addSecurityHeaders 
} = require('../middleware/auth');
const { 
    validatePassword, 
    hashPassword, 
    comparePassword, 
    sanitizeInput, 
    validateEmail, 
    validateUsername,
    logSecurityEvent,
    isIPLocked,
    recordLoginFailure,
    clearLoginFailures,
    getRemainingLockoutTime,
    SECURITY_CONFIG,
    lockedIPs
} = require('../utils/security');

const router = express.Router();

// 注册验证规则
const validateRegistration = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .custom(value => {
            if (!validateUsername(value)) {
                throw new Error('用户名只能包含字母、数字和下划线');
            }
            return true;
        }),
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('密码长度至少为8个字符')
        .custom(value => {
            const validation = validatePassword(value);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            return true;
        }),
    body('verificationCode')
        .isLength({ min: 6, max: 6 })
        .withMessage('验证码必须是6位数字')
];

// 登录验证规则
const validateLogin = [
    body('username')
        .notEmpty()
        .withMessage('用户名不能为空')
        .customSanitizer(value => sanitizeInput(value, 'string')),
    body('password')
        .notEmpty()
        .withMessage('密码不能为空')
];

// 发送验证码
router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: '请输入有效的邮箱地址' });
        }

        // 检查邮箱是否已注册
        const existingUser = await db('users').where('email', email).first();
        if (existingUser) {
            return res.status(409).json({ error: '该邮箱已注册' });
        }

        // 生成并发送验证码
        const code = await generateVerificationCode();
        await storeVerificationCode(email, code);
        
        const emailResult = await sendVerificationEmail(email, code);
        
        if (emailResult.success) {
            logSecurityEvent('verification_code_sent', { email }, req);
            res.json({ message: '验证码已发送到您的邮箱' });
        } else {
            console.error('邮件发送失败:', emailResult.error);
            res.status(500).json({ error: '验证码发送失败，请稍后重试' });
        }
    } catch (error) {
        console.error('发送验证码错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户注册
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { username, email, password, verificationCode } = req.body;

        // 验证验证码
        const verificationResult = await verifyCode(email, verificationCode);
        
        if (!verificationResult.valid) {
            logSecurityEvent('verification_code_failed', { email, code: verificationCode }, req);
            if (req.headers['hx-request']) {
                return res.status(400).send(`
                    <div class="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300 text-sm font-medium">
                        ${verificationResult.message}
                    </div>
                `);
            }
            return res.status(400).json({ error: verificationResult.message });
        }
        
        logSecurityEvent('verification_code_success', { email }, req);

        // 检查用户是否已存在
        const existingUser = await db('users')
            .where('username', username)
            .orWhere('email', email)
            .first();

        if (existingUser) {
            logSecurityEvent('registration_duplicate_user', { username, email }, req);
            if (req.headers['hx-request']) {
                return res.status(409).send(`
                    <div class="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300 text-sm font-medium">
                        用户名或邮箱已存在
                    </div>
                `);
            }
            return res.status(409).json({ error: '用户名或邮箱已存在' });
        }

        // 哈希密码
        const passwordHash = await hashPassword(password);

        // 创建用户
        const [userId] = await db('users').insert({
            username,
            email,
            password_hash: passwordHash,
            role: 'user',
            is_active: true,
            email_verified_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });

        // 生成token对
        const user = { id: userId, username, role: 'user' };
        const tokens = generateTokenPair(user);

        // 更新最后登录时间
        await db('users')
            .where('id', userId)
            .update({ last_login_at: new Date() });

        // 记录安全事件
        logSecurityEvent('user_registered', { userId, username, email }, req);

        // 设置安全的cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        };

        res.cookie('token', tokens.accessToken, cookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });

        if (req.headers['hx-request']) {
            return res.status(200).send(`
                <div class="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-sm">
                    注册成功！正在跳转...
                </div>
                <script>
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                </script>
            `);
        }

        res.json({ 
            message: '注册成功',
            user: { id: userId, username, role: 'user' },
            tokens
        });

    } catch (error) {
        console.error('注册错误:', error);
        logSecurityEvent('registration_error', { error: error.message }, req);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

// 用户登录
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { username, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        // 管理员账号永不锁定 - 跳过所有锁定检查
        if (username === 'admin') {
            const user = await db('users')
                .where('username', 'admin')
                .first();
            if (!user) {
                return res.status(401).json({ error: '管理员账号不存在' });
            }
            const isValidPassword = await comparePassword(password, user.password_hash);
            if (!isValidPassword) {
                logSecurityEvent('login_failed_invalid_password', { username, ip: clientIP }, req);
                return res.status(401).json({ error: '密码错误，请检查后重试' });
            }
            // 管理员登录成功，清除失败记录
            clearLoginFailures(clientIP);
            const userData = { id: user.id, username: user.username, role: user.role };
            const tokens = generateTokenPair(userData);
            await db('users')
                .where('id', user.id)
                .update({ last_login_at: new Date() });
            logSecurityEvent('login_success', { userId: user.id, username: user.username, ip: clientIP }, req);
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15分钟
            };
            res.cookie('token', tokens.accessToken, cookieOptions);
            res.cookie('refreshToken', tokens.refreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
            });
            if (req.headers['hx-request']) {
                return res.status(200).send(`
                    <script>
                        window.location.href = '/dashboard';
                    </script>
                `);
            }
            return res.json({ 
                message: '登录成功',
                user: userData,
                tokens
            });
        }

        // 非管理员账号才检查IP锁定
        if (isIPLocked(clientIP, username)) {
            const remainingTime = getRemainingLockoutTime(clientIP);
            logSecurityEvent('login_attempt_blocked', { ip: clientIP, remainingTime }, req);
            return res.status(429).json({ 
                error: `账户已被锁定，请${remainingTime}分钟后再试`,
                remainingTime
            });
        }

        // 查找用户
        const user = await db('users')
            .where(function() {
                this.where('username', username).orWhere('email', username);
            })
            .first();

        if (!user) {
            recordLoginFailure(clientIP, username);
            logSecurityEvent('login_failed_invalid_user', { username, ip: clientIP }, req);
            return res.status(401).json({ error: '用户名不存在，请检查用户名或邮箱' });
        }
        
        if (!user.is_active) {
            recordLoginFailure(clientIP, username);
            logSecurityEvent('login_failed_inactive_user', { username, ip: clientIP }, req);
            return res.status(401).json({ error: '账户已被禁用，请联系管理员' });
        }

        // 验证密码
        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            recordLoginFailure(clientIP, username);
            logSecurityEvent('login_failed_invalid_password', { username, ip: clientIP }, req);
            return res.status(401).json({ error: '密码错误，请检查后重试' });
        }

        // 登录成功，清除失败记录
        clearLoginFailures(clientIP);

        // 生成token对
        const userData = { id: user.id, username: user.username, role: user.role };
        const tokens = generateTokenPair(userData);
                
        // 更新最后登录时间
        await db('users')
            .where('id', user.id)
            .update({ last_login_at: new Date() });

        // 记录成功登录
        logSecurityEvent('login_success', { userId: user.id, username: user.username, ip: clientIP }, req);

        // 设置安全的cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15分钟
        };

        res.cookie('token', tokens.accessToken, cookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });

        if (req.headers['hx-request']) {
            return res.status(200).send(`
                <script>
                    window.location.href = '/dashboard';
                </script>
            `);
        }

        res.json({ 
            message: '登录成功',
            user: userData,
            tokens
        });

    } catch (error) {
        console.error('登录错误:', error);
        logSecurityEvent('login_error', { error: error.message }, req);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// 刷新token
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: '刷新令牌缺失' });
        }

        // 检查 refreshToken 是否在黑名单中
        const { isTokenBlacklisted } = require('../middleware/auth');
        if (isTokenBlacklisted(refreshToken)) {
            logSecurityEvent('token_refresh_blocked_blacklisted', { ip: req.ip }, req);
            return res.status(401).json({ error: '刷新令牌已被撤销' });
        }

        // 验证刷新token
        const jwt = require('jsonwebtoken');
        const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        // 检查用户是否存在且活跃
        const user = await db('users')
            .where('id', decoded.userId)
            .where('is_active', true)
            .first();

        if (!user) {
            return res.status(401).json({ error: '用户不存在或已被禁用' });
        }

        // 生成新的token对
        const userData = { id: user.id, username: user.username, role: user.role };
        const tokens = generateTokenPair(userData);

        // 设置新的cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15分钟
        };

        res.cookie('token', tokens.accessToken, cookieOptions);

        logSecurityEvent('token_refreshed', { userId: user.id }, req);

        res.json({ 
            message: 'Token刷新成功',
            tokens
        });

    } catch (error) {
        console.error('刷新令牌错误:', error);
        logSecurityEvent('token_refresh_error', { error: error.message }, req);
        res.status(401).json({ error: '刷新令牌失败' });
    }
});

// 用户登出
router.post('/logout', authenticateToken, logout, (req, res) => {
    try {
        // 获取 refreshToken 并加入黑名单
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            blacklistToken(refreshToken);
        }

        // 清除cookie
        res.clearCookie('token');
        res.clearCookie('refreshToken');

        logSecurityEvent('user_logout', { userId: req.user.id }, req);

        res.json({ message: '登出成功' });
    } catch (error) {
        console.error('登出错误:', error);
        res.status(500).json({ error: '登出失败' });
    }
});

// 验证token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user 
    });
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db('users')
            .where('id', req.user.id)
            .select('id', 'username', 'email', 'role', 'avatar', 'created_at', 'last_login_at')
            .first();

        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 邮件配置验证
router.post('/validate-email-config', async (req, res) => {
    try {
        const result = await validateEmailConfig();
        res.json(result);
    } catch (error) {
        console.error('邮件配置验证错误:', error);
        res.status(500).json({ error: '邮件配置验证失败' });
    }
});

// 发送重置密码验证码
router.post('/send-reset-code', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: '请输入有效的邮箱地址' });
        }

        // 检查邮箱是否已注册
        const existingUser = await db('users').where('email', email).first();
        if (!existingUser) {
            return res.status(404).json({ error: '该邮箱未注册' });
        }

        // 生成并发送重置验证码
        const code = await generateVerificationCode();
        await storeVerificationCode(email, code, 'reset');
        
        const emailResult = await sendVerificationEmail(email, code, 'reset');
        
        if (emailResult.success) {
            logSecurityEvent('reset_code_sent', { email }, req);
            res.json({ message: '重置验证码已发送到您的邮箱' });
        } else {
            console.error('重置邮件发送失败:', emailResult.error);
            res.status(500).json({ error: '验证码发送失败，请稍后重试' });
        }
    } catch (error) {
        console.error('发送重置验证码错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 重置密码
router.post('/reset-password', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('验证码必须是6位数字'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('密码长度至少为8个字符')
        .custom(value => {
            const validation = validatePassword(value);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // 提取具体的错误信息
            const errorMessages = errors.array().map(error => {
                switch (error.param) {
                    case 'email':
                        return '请输入有效的邮箱地址';
                    case 'verificationCode':
                        return '验证码必须是6位数字';
                    case 'newPassword':
                        if (error.msg.includes('至少为8个字符')) {
                            return '密码长度至少为8位';
                        }
                        return error.msg;
                    default:
                        return error.msg;
                }
            });
            
            return res.status(400).json({ 
                error: errorMessages.join('；'),
                details: errors.array() 
            });
        }

        const { email, verificationCode, newPassword } = req.body;

        // 验证重置验证码
        const verificationResult = await verifyCode(email, verificationCode, 'reset');
        
        if (!verificationResult.valid) {
            logSecurityEvent('reset_code_failed', { email, code: verificationCode }, req);
            return res.status(400).json({ error: verificationResult.message });
        }
        
        logSecurityEvent('reset_code_success', { email }, req);

        // 检查用户是否存在
        const user = await db('users').where('email', email).first();
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 哈希新密码
        const passwordHash = await hashPassword(newPassword);

        // 更新密码
        await db('users')
            .where('id', user.id)
            .update({ 
                password_hash: passwordHash,
                updated_at: new Date()
            });

        // 记录安全事件
        logSecurityEvent('password_reset_success', { userId: user.id, email }, req);

        res.json({ message: '密码重置成功' });

    } catch (error) {
        console.error('重置密码错误:', error);
        logSecurityEvent('password_reset_error', { error: error.message }, req);
        res.status(500).json({ error: '重置密码失败，请稍后重试' });
    }
});

module.exports = router; 