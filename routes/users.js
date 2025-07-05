const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { comparePassword, hashPassword } = require('../utils/security');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars';
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：用户ID_时间戳_原始文件名
    const userId = req.user.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${userId}_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// JWT middleware
const authenticateToken = async (req, res, next) => {
  console.log('=== 用户路由认证中间件开始 ===');
  console.log('请求路径:', req.path);
  console.log('请求方法:', req.method);
  console.log('Cookie:', req.cookies);
  console.log('Authorization头:', req.headers.authorization);
  
  // 优先从 cookie 读取 token，然后从 Authorization header
  const token = req.cookies && req.cookies.token
    ? req.cookies.token
    : (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

  console.log('提取的token:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    console.log('没有找到token，返回401');
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    console.log('使用的JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('JWT解码成功:', decoded);
    
    const user = await db('users')
      .where('id', decoded.userId)
      .where('is_active', true)
      .first();

    console.log('数据库查询结果:', user ? { id: user.id, username: user.username } : 'null');

    if (!user) {
      console.log('用户不存在或已被禁用');
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    console.log('认证成功，用户信息:', req.user);
    console.log('=== 用户路由认证中间件结束 ===');
    next();
  } catch (error) {
    console.log('JWT验证失败:', error.message);
    console.log('错误详情:', error);
    console.log('=== 用户路由认证中间件结束 ===');
    return res.status(403).json({ error: '无效的访问令牌' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = db('users')
      .select('id', 'username', 'email', 'role', 'is_active', 'created_at', 'last_login_at')
      .orderBy('created_at', 'desc');

    // Apply filters
    if (search) {
      query = query.where(function() {
        this.where('username', 'ILIKE', `%${search}%`)
          .orWhere('email', 'ILIKE', `%${search}%`);
      });
    }

    if (role) {
      query = query.where('role', role);
    }

    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ total }] = await totalQuery.count('* as total');

    // Get paginated results
    const users = await query
      .limit(limit)
      .offset(offset);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// Get user statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total users
    const [{ totalUsers }] = await db('users').count('* as totalUsers');
    
    // Get active users
    const [{ activeUsers }] = await db('users')
      .where('is_active', true)
      .count('* as activeUsers');
    
    // Get users by role
    const usersByRole = await db('users')
      .select('role')
      .count('* as count')
      .groupBy('role');
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [{ recentRegistrations }] = await db('users')
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as recentRegistrations');
    
    // Get users with recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [{ recentActivity }] = await db('users')
      .where('last_login_at', '>=', sevenDaysAgo)
      .count('* as recentActivity');

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        usersByRole,
        recentRegistrations,
        recentActivity
      }
    });

  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// 更新用户个人设置
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, currentPassword, newPassword, emailNotifications, browserNotifications, studyReminders } = req.body;
        
        // 获取当前用户信息
        const user = await db('users').where('id', userId).first();
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        
        // 验证用户名和邮箱是否已被其他用户使用
        if (username && username !== user.username) {
            const existingUser = await db('users').where('username', username).whereNot('id', userId).first();
            if (existingUser) {
                return res.status(400).json({ success: false, error: '用户名已被使用' });
            }
        }
        
        if (email && email !== user.email) {
            const existingUser = await db('users').where('email', email).whereNot('id', userId).first();
            if (existingUser) {
                return res.status(400).json({ success: false, error: '邮箱已被使用' });
            }
        }
        
        // 如果要修改密码，验证当前密码
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, error: '修改密码需要输入当前密码' });
            }
            
            // 校验当前密码
            const isValidPassword = await comparePassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: '当前密码错误' });
            }
            
            // 验证新密码强度
            if (newPassword.length < 6) {
                return res.status(400).json({ success: false, error: '新密码长度至少6位' });
            }
        }
        
        // 构建更新数据
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (newPassword) {
            const hashedPassword = await hashPassword(newPassword);
            updateData.password_hash = hashedPassword;
        }
        
        // 更新通知设置
        if (emailNotifications !== undefined) updateData.email_notifications = emailNotifications;
        if (browserNotifications !== undefined) updateData.browser_notifications = browserNotifications;
        if (studyReminders !== undefined) updateData.study_reminders = studyReminders;
        
        // 更新用户信息
        await db('users').where('id', userId).update({
            ...updateData,
            updated_at: new Date()
        });
        
        res.json({ 
            success: true, 
            message: '个人设置更新成功',
            user: {
                id: userId,
                username: username || user.username,
                email: email || user.email
            }
        });
        
    } catch (error) {
        console.error('更新个人设置失败:', error);
        res.status(500).json({ success: false, error: '服务器内部错误' });
    }
});

// 获取用户通知设置
router.get('/notification-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await db('users')
            .select('email_notifications', 'browser_notifications', 'study_reminders')
            .where('id', userId)
            .first();
            
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({
            emailNotifications: user.email_notifications || false,
            browserNotifications: user.browser_notifications || false,
            studyReminders: user.study_reminders || false
        });
        
    } catch (error) {
        console.error('获取通知设置失败:', error);
        res.status(500).json({ error: '获取通知设置失败' });
    }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, [
  body('email').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('role').optional().isIn(['user', 'admin']).withMessage('角色值不正确'),
  body('is_active').optional().isBoolean().withMessage('激活状态必须是布尔值')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { email, role, is_active } = req.body;

    // Check if user exists
    const user = await db('users')
      .where('id', id)
      .first();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Prevent admin from deactivating themselves
    if (parseInt(id) === req.user.id && is_active === false) {
      return res.status(400).json({ error: '不能停用自己的账户' });
    }

    // Update fields
    const updateData = { updated_at: new Date() };

    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await db('users')
        .where('email', email)
        .whereNot('id', id)
        .first();

      if (existingUser) {
        return res.status(409).json({ error: '邮箱已被使用' });
      }
      updateData.email = email;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Update user
    await db('users')
      .where('id', id)
      .update(updateData);

    const updatedUser = await db('users')
      .select('id', 'username', 'email', 'role', 'is_active', 'created_at', 'last_login_at')
      .where('id', id)
      .first();

    res.json({
      message: '用户更新成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await db('users')
      .where('id', id)
      .first();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    // Delete user (cascade will handle related data)
    await db('users')
      .where('id', id)
      .del();

    res.json({ message: '用户删除成功' });

  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 上传头像
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log('=== 头像上传请求开始 ===');
    console.log('用户信息:', req.user);
    console.log('文件信息:', req.file);
    
    // 添加数据库连接调试信息
    const dbInfo = await db.raw('SELECT current_database() as db_name, current_user as user');
    console.log('当前数据库连接信息:', dbInfo.rows[0]);
    
    // 检查users表结构
    const columns = await db('users').columnInfo();
    console.log('users表字段列表:', Object.keys(columns));
    console.log('avatar字段是否存在:', 'avatar' in columns);
    
    if (!req.file) {
      console.log('没有上传文件');
      return res.status(400).json({ success: false, error: '请选择要上传的图片文件' });
    }

    const userId = req.user.id;
    const filePath = req.file.path;
    const fileName = req.file.filename;

    console.log('用户ID:', userId);
    console.log('文件路径:', filePath);
    console.log('文件名:', fileName);

    // 获取当前用户的头像信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      console.log('用户不存在:', userId);
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    console.log('当前用户信息:', {
      id: user.id,
      username: user.username,
      avatar: user.avatar
    });

    // 删除旧头像文件（如果存在）
    if (user.avatar) {
      const oldAvatarPath = path.join('uploads/avatars', user.avatar);
      console.log('删除旧头像文件:', oldAvatarPath);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
        console.log('旧头像文件删除成功');
      } else {
        console.log('旧头像文件不存在');
      }
    }

    // 更新数据库中的头像字段
    console.log('开始更新数据库头像字段...');
    console.log('更新SQL参数:', { userId, fileName });
    
    const updateResult = await db('users').where('id', userId).update({
      avatar: fileName,
      updated_at: new Date()
    });
    
    console.log('数据库更新结果:', updateResult);

    console.log('数据库更新成功');

    res.json({
      success: true,
      message: '头像上传成功',
      avatar: fileName,
      avatarUrl: `/uploads/avatars/${fileName}`,
      userId: userId
    });

  } catch (error) {
    console.error('=== 头像上传失败 ===');
    console.error('错误详情:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果上传失败，删除已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: '头像上传失败' });
  }
});

// 删除头像
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取当前用户的头像信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 删除头像文件（如果存在）
    if (user.avatar) {
      const avatarPath = path.join('uploads/avatars', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // 清除数据库中的头像字段
    await db('users').where('id', userId).update({
      avatar: null,
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: '头像删除成功'
    });

  } catch (error) {
    console.error('头像删除失败:', error);
    res.status(500).json({ success: false, error: '头像删除失败' });
  }
});

// 发送注销验证码
router.post('/send-deactivation-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 生成6位验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存验证码到数据库（设置15分钟过期）
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟后过期
    
    await db('email_verifications').insert({
      user_id: userId,
      email: user.email,
      verification_code: verificationCode,
      type: 'deactivation',
      expires_at: expiresAt,
      created_at: new Date()
    });
    
    // 发送邮件
    const emailService = require('../services/email');
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; text-align: center;">账户注销验证</h2>
        <p>您好 ${user.username}，</p>
        <p>我们收到了您的账户注销请求。为了确保这是您本人的操作，请使用以下验证码完成注销流程：</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #dc2626; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
        </div>
        <p><strong>重要提醒：</strong></p>
        <ul>
          <li>此验证码将在15分钟后过期</li>
          <li>如果您没有请求注销账户，请忽略此邮件</li>
          <li>注销后，您的所有数据将被永久删除，无法恢复</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
    `;
    
    await emailService.sendEmail({
      to: user.email,
      subject: '账户注销验证码 - 学习追踪系统',
      html: emailContent
    });
    
    res.json({ 
      success: true, 
      message: '验证码已发送到您的邮箱' 
    });
    
  } catch (error) {
    console.error('发送注销验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败，请重试' });
  }
});

// 注销账户
router.post('/deactivate-account', authenticateToken, async (req, res) => {
  try {
    const { verificationCode, confirmText } = req.body;
    const userId = req.user.id;
    
    // 验证输入
    if (!verificationCode || !confirmText) {
      return res.status(400).json({ error: '请提供验证码和确认文本' });
    }
    
    if (confirmText !== '注销账户') {
      return res.status(400).json({ error: '确认文本不正确' });
    }
    
    // 获取用户信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 验证验证码
    const verification = await db('email_verifications')
      .where('user_id', userId)
      .where('verification_code', verificationCode)
      .where('type', 'deactivation')
      .where('expires_at', '>', new Date())
      .where('used', false)
      .first();
    
    if (!verification) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }
    
    // 标记验证码为已使用
    await db('email_verifications')
      .where('id', verification.id)
      .update({ used: true, used_at: new Date() });
    
    // 开始事务处理注销
    await db.transaction(async (trx) => {
      // 1. 删除用户的学习记录
      await trx('study_sessions').where('user_id', userId).del();
      await trx('study_records').where('user_id', userId).del();
      
      // 2. 删除用户的项目
      await trx('study_projects').where('user_id', userId).del();
      
      // 3. 删除用户的成就记录
      await trx('user_achievements').where('user_id', userId).del();
      
      // 4. 删除用户的积分记录
      await trx('points_records').where('user_id', userId).del();
      await trx('user_points').where('user_id', userId).del();
      
      // 5. 删除用户的兑换记录
      await trx('exchange_records').where('user_id', userId).del();
      
      // 6. 删除用户的通知
      await trx('notifications').where('user_id', userId).del();
      await trx('notification_settings').where('user_id', userId).del();
      
      // 7. 删除用户的邮箱验证记录
      await trx('email_verifications').where('user_id', userId).del();
      
      // 8. 删除用户头像文件
      if (user.avatar) {
        const avatarPath = path.join('uploads/avatars', user.avatar);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }
      
      // 9. 最后删除用户账户
      await trx('users').where('id', userId).del();
    });
    
    // 发送注销确认邮件
    const emailService = require('../services/email');
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; text-align: center;">账户注销确认</h2>
        <p>您好 ${user.username}，</p>
        <p>您的账户已成功注销。以下是注销详情：</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #dc2626; margin-top: 0;">注销时间</h3>
          <p>${new Date().toLocaleString('zh-CN')}</p>
          <h3 style="color: #dc2626;">已删除的数据</h3>
          <ul>
            <li>个人资料信息</li>
            <li>学习记录和项目</li>
            <li>成就和积分</li>
            <li>兑换记录</li>
            <li>通知设置</li>
          </ul>
        </div>
        <p><strong>重要提醒：</strong></p>
        <ul>
          <li>您的所有数据已被永久删除，无法恢复</li>
          <li>如需重新使用系统，请重新注册账户</li>
          <li>感谢您使用学习追踪系统</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
    `;
    
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: '账户注销确认 - 学习追踪系统',
        html: emailContent
      });
    } catch (emailError) {
      console.error('发送注销确认邮件失败:', emailError);
      // 邮件发送失败不影响注销流程
    }
    
    res.json({ 
      success: true, 
      message: '账户注销成功' 
    });
    
  } catch (error) {
    console.error('注销账户失败:', error);
    res.status(500).json({ error: '注销账户失败，请重试' });
  }
});

module.exports = router; 