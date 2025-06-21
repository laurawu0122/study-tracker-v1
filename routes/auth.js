const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDatabase, isFirstAdminLogin, markAdminPasswordChanged, getSystemConfig, updateSystemConfig, saveVerificationCode, verifyCode } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail, generateVerificationCode, validateEmailConfig } = require('../services/email');

const router = express.Router();

// 发送验证码路由
router.post('/send-verification', [
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { email } = req.body;
        const db = getDatabase();

        // 检查邮箱是否已被注册
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('数据库查询错误:', err);
                return res.status(500).json({ error: '服务器内部错误' });
            }

            if (row) {
                return res.status(400).json({ error: '该邮箱已被注册' });
            }

            // 检查邮件配置
            // if (!validateEmailConfig()) {
            //     return res.status(503).json({ error: '邮件服务暂时不可用，请联系管理员' });
            // }

            // 生成验证码
            const code = generateVerificationCode();

            try {
                // 保存验证码到数据库
                await saveVerificationCode(email, code, 'registration');
                
                // 发送验证码邮件
                const sent = await sendVerificationEmail(email, code);
                
                if (sent) {
                    res.json({ 
                        message: '验证码已发送到您的邮箱',
                        email: email
                    });
                } else {
                    res.status(500).json({ error: '发送验证码失败，请稍后重试' });
                }
            } catch (error) {
                console.error('发送验证码错误:', error);
                res.status(500).json({ error: '发送验证码失败，请稍后重试' });
            }
        });

    } catch (error) {
        console.error('发送验证码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 注册路由 - 现在需要验证码
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码长度至少6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含大小写字母和数字'),
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址'),
    body('verificationCode')
        .isLength({ min: 6, max: 6 })
        .withMessage('验证码必须是6位数字')
        .matches(/^\d{6}$/)
        .withMessage('验证码格式不正确')
], async (req, res) => {
    try {
        // 检查注册是否启用
        const registrationEnabled = await getSystemConfig('registration_enabled');
        if (registrationEnabled !== 'true') {
            return res.status(403).json({ error: '注册功能已被管理员关闭' });
        }

        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { username, password, email, verificationCode } = req.body;
        const db = getDatabase();

        // 验证验证码
        const verificationResult = await verifyCode(email, verificationCode, 'registration');
        if (!verificationResult.valid) {
            return res.status(400).json({ error: `验证码验证失败: ${verificationResult.reason}` });
        }

        // 检查用户名是否已存在
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                console.error('数据库查询错误:', err);
                return res.status(500).json({ error: '服务器内部错误' });
            }

            if (row) {
                return res.status(400).json({ error: '用户名已存在' });
            }

            // 检查邮箱是否已存在（双重检查）
            db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
                if (err) {
                    console.error('数据库查询错误:', err);
                    return res.status(500).json({ error: '服务器内部错误' });
                }

                if (row) {
                    return res.status(400).json({ error: '邮箱已被注册' });
                }

                // 加密密码
                const saltRounds = 12;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                // 创建用户
                db.run(
                    'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
                    [username, passwordHash, email, 'user'],
                    function(err) {
                        if (err) {
                            console.error('创建用户失败:', err);
                            return res.status(500).json({ error: '创建用户失败' });
                        }

                        // 生成JWT令牌
                        const token = generateToken({
                            id: this.lastID,
                            username: username,
                            role: 'user'
                        });

                        res.status(201).json({
                            message: '注册成功',
                            token: token,
                            user: {
                                id: this.lastID,
                                username: username,
                                email: email,
                                role: 'user'
                            }
                        });
                    }
                );
            });
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 登录路由
router.post('/login', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { username, password } = req.body;
        const db = getDatabase();

        // 查找用户
        db.get(
            'SELECT id, username, password_hash, email, role, is_first_admin, password_changed FROM users WHERE username = ? AND is_active = 1',
            [username],
            async (err, user) => {
                if (err) {
                    console.error('数据库查询错误:', err);
                    return res.status(500).json({ error: '服务器内部错误' });
                }

                if (!user) {
                    return res.status(401).json({ error: '用户名或密码错误' });
                }

                // 验证密码
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({ error: '用户名或密码错误' });
                }

                // 检查是否是首次管理员登录
                const isFirstLogin = await isFirstAdminLogin(username);
                
                // 更新最后登录时间
                db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

                // 生成JWT令牌
                const token = generateToken({
                    id: user.id,
                    username: user.username,
                    role: user.role
                });

                res.json({
                    message: '登录成功',
                    token: token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        isFirstAdmin: isFirstLogin,
                        passwordChanged: user.password_changed
                    }
                });
            }
        );

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 修改密码路由
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密码长度至少6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('新密码必须包含大小写字母和数字')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // 从JWT中获取
        const db = getDatabase();

        // 获取用户信息
        db.get('SELECT password_hash, role, is_first_admin FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err) {
                console.error('数据库查询错误:', err);
                return res.status(500).json({ error: '服务器内部错误' });
            }

            if (!user) {
                return res.status(404).json({ error: '用户不存在' });
            }

            // 验证当前密码
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(400).json({ error: '当前密码错误' });
            }

            // 加密新密码
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // 更新密码
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId], async (err) => {
                if (err) {
                    console.error('更新密码失败:', err);
                    return res.status(500).json({ error: '更新密码失败' });
                }

                // 如果是首次管理员登录，标记密码已更改
                if (user.is_first_admin && user.role === 'admin') {
                    await markAdminPasswordChanged(userId);
                }

                res.json({ message: '密码修改成功' });
            });
        });

    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 管理员控制注册功能
router.post('/admin/toggle-registration', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '权限不足' });
        }

        const { enabled } = req.body;
        await updateSystemConfig('registration_enabled', enabled ? 'true' : 'false');

        res.json({ 
            message: `注册功能已${enabled ? '启用' : '关闭'}`,
            registrationEnabled: enabled
        });

    } catch (error) {
        console.error('切换注册功能错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取系统状态
router.get('/system-status', async (req, res) => {
    try {
        const registrationEnabled = await getSystemConfig('registration_enabled');
        const firstAdminCreated = await getSystemConfig('first_admin_created');

        res.json({
            registrationEnabled: registrationEnabled === 'true',
            firstAdminCreated: firstAdminCreated === 'true'
        });

    } catch (error) {
        console.error('获取系统状态错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 验证令牌路由
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '访问令牌无效或已过期' });
        }
        res.json({ valid: true, user: user });
    });
});

module.exports = router; 