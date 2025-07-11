const express = require('express');
const router = express.Router();
const dbModule = require('../database/db');
const db = dbModule.db; // 获取Knex实例
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateDataImport, validateExcelStructure, validateDataRowCount, logSecurityEvent } = require('../middleware/security');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 管理员仪表板
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await dbModule.getAdminStats();
        res.render('admin/dashboard', {
            title: '管理员仪表板',
            stats,
            currentPage: 'admin-dashboard'
        });
    } catch (error) {
        logger.error('Admin dashboard error', { error: error.message, stack: error.stack });
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载管理员仪表板时出错'
        });
    }
});

// API端点 - 返回JSON数据
// 获取用户列表API
router.get('/users', async (req, res) => {
    const isDemoApi = req.originalUrl && req.originalUrl.startsWith('/demo/api');
    if (isDemoApi) {
        // 直接返回硬编码的 demo 用户数据
        return res.json({
            success: true,
            users: [
                { id: 1, username: 'demo_user1', email: 'demo1@demo.com', role: 'user', is_active: true, avatar: '/assets/ico/default.svg' },
                { id: 2, username: 'demo_user2', email: 'demo2@demo.com', role: 'user', is_active: true, avatar: '/assets/ico/default.svg' },
                { id: 3, username: 'test_student', email: 'test_student@demo.com', role: 'user', is_active: true, avatar: '/assets/ico/default.svg' },
                { id: 4, username: 'study_enthusiast', email: 'enthusiast@demo.com', role: 'user', is_active: false, avatar: '/assets/ico/default.svg' },
                { id: 5, username: 'demo_user3', email: 'demo3@demo.com', role: 'user', is_active: true, avatar: '/assets/ico/default.svg' }
            ],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalUsers: 5,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    }
    try {
        const { page = 1, limit = 10, search, role, status } = req.query;
        
        // 根据状态筛选器决定是否包含非活跃用户
        const includeInactive = status === 'inactive' || status === '';
        const users = await dbModule.getAllUsers(includeInactive);
        
        // 简单的分页和筛选逻辑
        let filteredUsers = users;
        
        // 过滤demo用户：demo账号只出现在演示环境中，对admin不可见
        const isDemoApi = req.originalUrl && req.originalUrl.startsWith('/demo/api');
        // 调试日志
        logger.info('用户列表API调试信息', {
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl,
            path: req.path,
            isDemoApi: isDemoApi
        });
        
        if (isDemoApi) {
            // 演示环境：只显示demo用户
            filteredUsers = filteredUsers.filter(user => 
                user.username.startsWith('demo_') || 
                user.username.includes('demo') ||
                user.username.includes('test_') ||
                user.username === 'test_student' ||
                user.username === 'study_enthusiast'
            );
            logger.info('演示环境：只显示demo用户');
        } else {
            // 非演示环境（包括生产环境和开发环境）：过滤掉demo用户
            filteredUsers = filteredUsers.filter(user => 
                !user.username.startsWith('demo_') && 
                !user.username.includes('demo') &&
                !user.username.includes('test_') &&
                user.username !== 'test_student' &&
                user.username !== 'study_enthusiast'
            );
            logger.info('非演示环境：已过滤demo用户');
        }
        
        if (search) {
            filteredUsers = filteredUsers.filter(user => 
                user.username.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        if (role) {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }
        
        // 如果明确要求查看特定状态，进行二次筛选
        if (status === 'active') {
            filteredUsers = filteredUsers.filter(user => user.is_active === true);
        } else if (status === 'inactive') {
            filteredUsers = filteredUsers.filter(user => user.is_active === false);
        }
        
        const totalUsers = filteredUsers.length;
        const totalPages = Math.ceil(totalUsers / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            users: paginatedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalUsers,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        logger.error('Admin API users error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: '获取用户列表失败'
        });
    }
});

// 获取所有用户积分信息API
router.get('/users/points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        logger.info('开始获取所有用户积分信息');
        
        // 构建查询条件
        let query = db('users')
            .leftJoin('user_points', 'users.id', 'user_points.user_id')
            .select(
                'users.id',
                'users.username',
                'users.email',
                'users.role',
                'users.is_active',
                'users.avatar',
                'user_points.total_points',
                'user_points.available_points',
                'user_points.used_points',
                'user_points.last_updated'
            )
            .where('users.is_active', true);
        
        // 过滤demo用户：demo账号只出现在演示环境中，对admin不可见
        const isDemoApi = req.originalUrl && req.originalUrl.startsWith('/demo/api');
        
        if (isDemoApi) {
            // 演示环境：只显示demo用户
            query = query.whereIn('users.username', [
                'demo_user1', 'demo_user2', 'demo_user3', 
                'test_student', 'study_enthusiast'
            ]).orWhere('users.username', 'like', 'demo_%')
              .orWhere('users.username', 'like', '%test_%');
            logger.info('演示环境：只显示demo用户积分信息');
        } else {
            // 非演示环境（包括生产环境和开发环境）：过滤掉demo用户
            query = query.whereNotIn('users.username', [
                'demo_user1', 'demo_user2', 'demo_user3', 
                'test_student', 'study_enthusiast'
            ]).whereNot('users.username', 'like', 'demo_%');
            logger.info('非演示环境：已过滤demo用户积分信息');
        }
        
        const usersWithPoints = await query.orderBy('user_points.total_points', 'desc');

        // 格式化数据
        const formattedUsers = usersWithPoints.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            avatar: user.avatar,
            total_points: user.total_points || 0,
            available_points: user.available_points || 0,
            used_points: user.used_points || 0,
            last_updated: user.last_updated
        }));

        logger.info(`成功获取 ${formattedUsers.length} 个用户的积分信息`);
        
        res.json({
            success: true,
            users: formattedUsers,
            total: formattedUsers.length
        });
    } catch (error) {
        logger.error('获取用户积分信息失败', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: '获取用户积分信息失败: ' + error.message
        });
    }
});

// 获取待审核兑换记录API
router.get('/exchange/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        logger.info('开始获取待审核兑换记录');
        
        // 获取所有待审核的兑换记录
        const pendingRecords = await db('exchange_records')
            .join('users', 'exchange_records.user_id', 'users.id')
            .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
            .select(
                'exchange_records.id',
                'exchange_records.user_id',
                'exchange_records.product_id',
                'exchange_records.points_required',
                'exchange_records.quantity',
                'exchange_records.status',
                'exchange_records.created_at',
                'exchange_records.updated_at',
                'users.username',
                'users.email',
                'users.avatar',
                'virtual_products.name as product_name',
                'virtual_products.description as product_description',
                'virtual_products.points_cost'
            )
            .where('exchange_records.status', 'pending')
            .orderBy('exchange_records.created_at', 'asc');

        // 格式化数据
        const formattedRecords = pendingRecords.map(record => ({
            id: record.id,
            user_id: record.user_id,
            product_id: record.product_id,
            points_required: record.points_required,
            quantity: record.quantity,
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at,
            user: {
                username: record.username,
                email: record.email,
                avatar: record.avatar
            },
            product: {
                name: record.product_name,
                description: record.product_description,
                points_cost: record.points_cost
            }
        }));

        logger.info(`成功获取 ${formattedRecords.length} 条待审核记录`);
        
        res.json({
            success: true,
            records: formattedRecords,
            total: formattedRecords.length
        });
    } catch (error) {
        logger.error('获取待审核记录失败', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: '获取待审核记录失败: ' + error.message
        });
    }
});

// 管理员用户数据查询API
router.get('/data/user-data', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            userId, 
            dataType, 
            startDate, 
            endDate, 
            projectId, 
            status, 
            operationType,
            page = 1,
            limit = 20
        } = req.query;

        // 验证必填参数
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '用户ID是必填参数' 
            });
        }

        if (!dataType) {
            return res.status(400).json({ 
                success: false, 
                error: '数据类型是必填参数' 
            });
        }

        // 验证分页参数
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;

        let result = {};

        switch (dataType) {
            case 'projects':
                result = await getProjectsData(userId, startDate, endDate, status, pageNum, limitNum, offset);
                break;
            case 'sessions':
                result = await getSessionsData(userId, startDate, endDate, projectId, pageNum, limitNum, offset);
                break;
            case 'user-logs':
                result = await getUserLogsData(userId, startDate, endDate, operationType, pageNum, limitNum, offset);
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: '不支持的数据类型' 
                });
        }

        res.json({
            success: true,
            data: result.data,
            total: result.total,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(result.total / limitNum),
                totalItems: result.total,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < Math.ceil(result.total / limitNum),
                hasPrevPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('查询用户数据失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '查询失败: ' + error.message 
        });
    }
});

// 获取项目数据
async function getProjectsData(userId, startDate, endDate, status, page = 1, limit = 20, offset = 0) {
    let baseQuery = db('study_projects')
        .join('users', 'study_projects.user_id', 'users.id')
        .where('study_projects.user_id', userId);

    if (startDate) {
        baseQuery = baseQuery.where('study_projects.created_at', '>=', startDate);
    }
    if (endDate) {
        baseQuery = baseQuery.where('study_projects.created_at', '<=', endDate + ' 23:59:59');
    }
    if (status) {
        baseQuery = baseQuery.where('study_projects.status', status);
    }

    // 获取总数
    const totalResult = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalResult.count);

    // 获取分页数据
    const data = await baseQuery
        .select(
            'study_projects.*',
            'users.username'
        )
        .orderBy('study_projects.created_at', 'desc')
        .limit(limit)
        .offset(offset);

    return { data, total };
}

// 获取学习记录数据
async function getSessionsData(userId, startDate, endDate, projectId, page = 1, limit = 20, offset = 0) {
    let baseQuery = db('study_sessions')
        .join('users', 'study_sessions.user_id', 'users.id')
        .leftJoin('study_projects', 'study_sessions.project_id', 'study_projects.id')
        .where('study_sessions.user_id', userId);

    if (startDate) {
        baseQuery = baseQuery.where('study_sessions.study_date', '>=', startDate);
    }
    if (endDate) {
        baseQuery = baseQuery.where('study_sessions.study_date', '<=', endDate);
    }
    if (projectId) {
        baseQuery = baseQuery.where('study_sessions.project_id', projectId);
    }

    // 获取总数
    const totalResult = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalResult.count);

    // 获取分页数据
    const data = await baseQuery
        .select(
            'study_sessions.*',
            'users.username',
            db.raw('COALESCE(study_projects.name, study_sessions.project_name) as project_name')
        )
        .orderBy('study_sessions.created_at', 'desc')
        .limit(limit)
        .offset(offset);

    return { data, total };
}

// 获取用户操作日志数据
async function getUserLogsData(userId, startDate, endDate, operationType, page = 1, limit = 20, offset = 0) {
    let baseQuery = db('data_operation_logs')
        .join('users', 'data_operation_logs.user_id', 'users.id')
        .where('data_operation_logs.user_id', userId);

    if (startDate) {
        baseQuery = baseQuery.where('data_operation_logs.created_at', '>=', startDate);
    }
    if (endDate) {
        baseQuery = baseQuery.where('data_operation_logs.created_at', '<=', endDate + ' 23:59:59');
    }
    if (operationType) {
        baseQuery = baseQuery.where('data_operation_logs.operation_type', operationType);
    }

    // 获取总数
    const totalResult = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalResult.count);

    // 获取分页数据
    const data = await baseQuery
        .select(
            'data_operation_logs.*',
            'users.username'
        )
        .orderBy('data_operation_logs.created_at', 'desc')
        .limit(limit)
        .offset(offset);

    return { data, total };
}

// 创建用户API
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role = 'user', points = 0, pointsReason } = req.body;
        
        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名、邮箱和密码为必填项'
            });
        }
        
        // 验证用户名格式
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                error: '用户名长度必须在3-20个字符之间'
            });
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: '请输入有效的邮箱地址'
            });
        }
        
        // 验证密码强度
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: '密码长度至少为6个字符'
            });
        }
        
        // 验证角色
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: '无效的用户角色'
            });
        }
        
        // 检查用户名是否已存在
        const existingUsername = await db('users').where('username', username).first();
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                error: '用户名已被使用'
            });
        }
        
        // 检查邮箱是否已存在
        const existingEmail = await db('users').where('email', email).first();
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                error: '邮箱已被使用'
            });
        }
        
        // 开始事务
        const trx = await db.transaction();
        
        try {
            // 加密密码
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(password, 10);
            
            // 创建用户
            const [userResult] = await trx('users').insert({
                username,
                email,
                password_hash: passwordHash,
                role,
                is_active: true,
                email_verified_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            }).returning('id');
            
            const userId = userResult.id;
            
            // 如果提供了初始积分，创建积分记录
            if (points > 0) {
                await trx('user_points').insert({
                    user_id: userId,
                    total_points: points,
                    available_points: points,
                    used_points: 0,
                    last_updated: new Date(),
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
            
            // 记录创建用户操作日志
            await trx('data_operation_logs').insert({
                user_id: req.user.id,
                user_username: req.user.username,
                operation_type: 'user_creation',
                operation_name: '创建用户',
                target_user_id: userId,
                description: `管理员创建用户: ${username}`,
                details: JSON.stringify({
                    created_user: {
                        id: userId,
                        username,
                        email,
                        role
                    },
                    initial_points: points
                }),
                created_at: new Date()
            });
            
            await trx.commit();
            
            res.json({
                success: true,
                message: '用户创建成功',
                user: {
                    id: userId,
                    username,
                    email,
                    role,
                    is_active: true,
                    points: points
                }
            });
            
        } catch (error) {
            await trx.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Admin API create user error:', error);
        res.status(500).json({
            success: false,
            error: '创建用户失败'
        });
    }
});

// 获取单个用户信息API
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                error: '无效的用户ID'
            });
        }

        // 获取用户基本信息
        const user = await db('users')
            .where('id', userId)
            .select('id', 'username', 'email', 'role', 'is_active', 'avatar', 'created_at', 'last_login_at')
            .first();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        // 获取用户积分信息
        const userPoints = await db('user_points')
            .where('user_id', userId)
            .select('total_points', 'available_points', 'used_points')
            .first();

        // 合并用户信息和积分信息
        const userWithPoints = {
            ...user,
            points: userPoints ? userPoints.available_points : 0,
            total_points: userPoints ? userPoints.total_points : 0,
            used_points: userPoints ? userPoints.used_points : 0
        };

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        res.json({
            success: true,
            user: userWithPoints
        });
    } catch (error) {
        console.error('Admin API get user error:', error);
        res.status(500).json({
            success: false,
            error: '获取用户信息失败'
        });
    }
});

// 更新用户信息API
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, email, role, is_active, points, pointsReason } = req.body;
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                error: '无效的用户ID'
            });
        }

        // 检查用户是否存在
        const existingUser = await db('users').where('id', userId).first();
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        // 开始事务
        const trx = await db.transaction();

        try {
            // 更新用户基本信息
            const updateData = {
                username,
                email,
                role,
                updated_at: new Date()
            };
            
            // 只有当明确传递了 is_active 字段时才更新
            if (is_active !== undefined) {
                updateData.is_active = is_active === 'true' || is_active === true;
            }

            await trx('users')
                .where('id', userId)
                .update(updateData);

            // 如果提供了积分调整
            if (points !== undefined && pointsReason) {
                console.log('🔧 积分调整请求:', {
                    userId,
                    requestedPoints: points,
                    pointsReason,
                    adminUser: req.user.username
                });
                
                // 验证积分值
                if (typeof points !== 'number' || points < 0) {
                    return res.status(400).json({
                        success: false,
                        error: '积分值必须是非负数字'
                    });
                }
                
                // 获取当前用户积分信息
                const currentUserPoints = await trx('user_points')
                    .where('user_id', userId)
                    .first();
                
                const currentPoints = currentUserPoints ? currentUserPoints.available_points : 0;
                const pointsChange = points - currentPoints;
                
                console.log('🔧 积分调整计算:', {
                    currentPoints,
                    newPoints: points,
                    pointsChange
                });
                
                if (pointsChange !== 0) {
                    // 更新或创建用户积分记录
                    if (currentUserPoints) {
                        await trx('user_points')
                            .where('user_id', userId)
                            .update({
                                available_points: points,
                                total_points: currentUserPoints.total_points + pointsChange,
                                last_updated: new Date(),
                                updated_at: new Date()
                            });
                        console.log('✅ 更新用户积分记录成功');
                    } else {
                        await trx('user_points').insert({
                            user_id: userId,
                            total_points: points,
                            available_points: points,
                            used_points: 0,
                            last_updated: new Date(),
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                        console.log('✅ 创建用户积分记录成功');
                    }

                    // 记录积分操作日志
                    await trx('data_operation_logs').insert({
                        user_id: req.user.id,
                        user_username: req.user.username,
                        operation_type: 'points_adjustment',
                        operation_name: '调整用户积分',
                        target_user_id: userId,
                        description: `管理员调整用户积分: ${pointsReason}`,
                        details: JSON.stringify({
                            old_points: currentPoints,
                            new_points: points,
                            change: pointsChange,
                            reason: pointsReason
                        }),
                        created_at: new Date()
                    });
                    console.log('✅ 积分调整操作日志记录成功');
                } else {
                    console.log('ℹ️ 积分无变化，跳过更新');
                }
            }

            await trx.commit();

            res.json({
                success: true,
                message: '用户信息更新成功'
            });

        } catch (error) {
            await trx.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Admin API update user error:', error);
        res.status(500).json({
            success: false,
            error: '更新用户信息失败'
        });
    }
});

// 删除用户API
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { forceDelete = false } = req.query; // 新增：是否强制删除参数
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                error: '无效的用户ID'
            });
        }

        // 检查用户是否存在
        const existingUser = await db('users').where('id', userId).first();
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        // 防止删除管理员自己
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                error: '不能删除自己的账户'
            });
        }

        // 开始事务
        const trx = await db.transaction();

        try {
            let operationType, operationName, description, message;
            
            if (forceDelete === 'true' || forceDelete === true) {
                // 硬删除：真正删除用户
                operationType = 'user_hard_deletion';
                operationName = '强制删除用户';
                description = `管理员强制删除用户: ${existingUser.username}`;
                message = '用户已永久删除';
                
                // 记录强制删除操作日志
                await trx('data_operation_logs').insert({
                    user_id: req.user.id,
                    user_username: req.user.username,
                    operation_type: operationType,
                    operation_name: operationName,
                    target_user_id: userId,
                    description: description,
                    details: JSON.stringify({
                        deleted_user: {
                            id: existingUser.id,
                            username: existingUser.username,
                            email: existingUser.email,
                            role: existingUser.role
                        },
                        deletion_type: 'hard_delete'
                    }),
                    created_at: new Date()
                });

                // 硬删除：删除用户相关的所有数据
                await trx('study_sessions').where('user_id', userId).del();
                await trx('study_projects').where('user_id', userId).del();
                await trx('user_achievements').where('user_id', userId).del();
                await trx('user_points').where('user_id', userId).del();
                await trx('exchange_records').where('user_id', userId).del();
                await trx('notifications').where('user_id', userId).del();
                await trx('notification_settings').where('user_id', userId).del();
                await trx('email_verifications').where('user_id', userId).del();
                
                // 最后删除用户本身
                await trx('users').where('id', userId).del();
                
            } else {
                // 软删除：标记用户为非活跃
                operationType = 'user_soft_deletion';
                operationName = '软删除用户';
                description = `管理员软删除用户: ${existingUser.username}`;
                message = '用户已标记为非活跃';
                
                // 记录软删除操作日志
                await trx('data_operation_logs').insert({
                    user_id: req.user.id,
                    user_username: req.user.username,
                    operation_type: operationType,
                    operation_name: operationName,
                    target_user_id: userId,
                    description: description,
                    details: JSON.stringify({
                        deleted_user: {
                            id: existingUser.id,
                            username: existingUser.username,
                            email: existingUser.email,
                            role: existingUser.role
                        },
                        deletion_type: 'soft_delete'
                    }),
                    created_at: new Date()
                });

                // 软删除：只标记用户为非活跃状态
                await trx('users')
                    .where('id', userId)
                    .update({
                        is_active: false,
                        updated_at: new Date()
                    });
            }

            await trx.commit();

            res.json({
                success: true,
                message: message,
                deletionType: forceDelete === 'true' || forceDelete === true ? 'hard' : 'soft'
            });

        } catch (error) {
            await trx.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Admin API delete user error:', error);
        res.status(500).json({
            success: false,
            error: '删除用户失败'
        });
    }
});

// 获取数据统计API
router.get('/data/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await dbModule.getDataStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Admin API data stats error:', error);
        res.status(500).json({
            success: false,
            error: '获取数据统计失败'
        });
    }
});

// 获取系统配置API
router.get('/config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const config = await dbModule.getSystemConfig();
        res.json({
            success: true,
            config
        });
    } catch (error) {
        console.error('Admin API config error:', error);
        res.status(500).json({
            success: false,
            error: '获取系统配置失败'
        });
    }
});

// 保存系统配置API
router.post('/config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const config = req.body;
        // 这里需要实现保存配置的逻辑
        res.json({
            success: true,
            message: '配置保存成功'
        });
    } catch (error) {
        console.error('Admin API save config error:', error);
        res.status(500).json({
            success: false,
            error: '保存系统配置失败'
        });
    }
});

// 获取统计信息API
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await dbModule.getAdminStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Admin API stats error:', error);
        res.status(500).json({
            success: false,
            error: '获取统计信息失败'
        });
    }
});

// 获取操作日志API
router.get('/data/user-operation-logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', operationType = '', userId = '', startDate = '', endDate = '' } = req.query;
        
        // 构建查询条件
        let query = db('data_operation_logs').select('*');
        
        // 搜索条件
        if (search) {
            query = query.where(function() {
                this.where('operation_name', 'like', `%${search}%`)
                    .orWhere('description', 'like', `%${search}%`)
                    .orWhere('user_username', 'like', `%${search}%`);
            });
        }
        
        // 操作类型筛选
        if (operationType) {
            query = query.where('operation_type', operationType);
        }
        
        // 用户筛选
        if (userId) {
            query = query.where('user_id', userId);
        }
        
        // 时间范围筛选
        if (startDate) {
            query = query.where('created_at', '>=', startDate);
        }
        if (endDate) {
            query = query.where('created_at', '<=', endDate + ' 23:59:59');
        }
        
        // 获取总数 - 使用独立的查询
        let countQuery = db('data_operation_logs');
        
        // 应用相同的筛选条件
        if (search) {
            countQuery = countQuery.where(function() {
                this.where('operation_name', 'like', `%${search}%`)
                    .orWhere('description', 'like', `%${search}%`)
                    .orWhere('user_username', 'like', `%${search}%`);
            });
        }
        if (operationType) {
            countQuery = countQuery.where('operation_type', operationType);
        }
        if (userId) {
            countQuery = countQuery.where('user_id', userId);
        }
        if (startDate) {
            countQuery = countQuery.where('created_at', '>=', startDate);
        }
        if (endDate) {
            countQuery = countQuery.where('created_at', '<=', endDate + ' 23:59:59');
        }
        
        const totalResult = await countQuery.count('* as count').first();
        const total = parseInt(totalResult.count);
        
        // 分页
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const logs = await query
            .orderBy('created_at', 'desc')
            .limit(parseInt(limit))
            .offset(offset);
        
        const totalPages = Math.ceil(total / parseInt(limit));
        
        res.json({
            success: true,
            logs,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalLogs: total,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Admin API operation logs error:', error);
        res.status(500).json({
            success: false,
            error: '获取操作日志失败'
        });
    }
});

// 获取系统信息API
router.get('/system/info', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const os = require('os');
        const info = {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            uptime: os.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg()
        };
        res.json({
            success: true,
            info
        });
    } catch (error) {
        console.error('Admin API system info error:', error);
        res.status(500).json({
            success: false,
            error: '获取系统信息失败'
        });
    }
});

// 数据备份API
router.post('/data/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // 这里需要实现数据备份的逻辑
        res.json({
            success: true,
            message: '数据备份成功'
        });
    } catch (error) {
        console.error('Admin API backup error:', error);
        res.status(500).json({
            success: false,
            error: '数据备份失败'
        });
    }
});

// 数据导入恢复API
router.post('/data/import', authenticateToken, requireAdmin, validateDataImport, async (req, res) => {
    try {
        console.log('开始数据导入恢复...');
        
        const { file, importKey } = req.importValidation;
        
        // 调试：检查文件数据
        console.log('🔍 文件数据检查:', {
            fileName: file.name,
            fileSize: file.size,
            dataLength: file.data ? file.data.length : 0,
            dataType: typeof file.data,
            hasData: !!file.data,
            tempFilePath: file.tempFilePath,
            mv: typeof file.mv
        });
        
        // 引入XLSX库
        const XLSX = require('xlsx');
        
        // 安全读取Excel文件
        let workbook;
        try {
            // 如果使用临时文件，从文件路径读取；否则从内存读取
            if (file.tempFilePath) {
                console.log('📁 从临时文件读取:', file.tempFilePath);
                workbook = XLSX.readFile(file.tempFilePath, { 
                    cellFormula: false, // 禁用公式执行
                    cellHTML: false,    // 禁用HTML
                    cellNF: false,      // 禁用数字格式
                    cellStyles: false,  // 禁用样式
                    cellDates: true,    // 只允许日期
                    cellText: true      // 只允许文本
                });
            } else {
                console.log('💾 从内存读取文件数据');
                workbook = XLSX.read(file.data, { 
                    type: 'buffer',
                    cellFormula: false, // 禁用公式执行
                    cellHTML: false,    // 禁用HTML
                    cellNF: false,      // 禁用数字格式
                    cellStyles: false,  // 禁用样式
                    cellDates: true,    // 只允许日期
                    cellText: true      // 只允许文本
                });
            }
        } catch (error) {
            logSecurityEvent(req, 'excel_parse_failed', { error: error.message });
            return res.status(400).json({
                success: false,
                error: 'Excel文件解析失败，请检查文件是否损坏'
            });
        }
        
        // 验证Excel文件结构
        try {
            validateExcelStructure(workbook);
        } catch (error) {
            logSecurityEvent(req, 'excel_structure_validation_failed', { error: error.message });
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        // 验证数据行数限制
        try {
            const totalRows = validateDataRowCount(workbook);
            console.log(`验证通过，总数据行数: ${totalRows}`);
        } catch (error) {
            logSecurityEvent(req, 'data_row_count_validation_failed', { error: error.message });
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        // 开始事务
        const trx = await db.transaction();
        
        try {
            let importStats = {
                users: 0,
                projects: 0,
                studyRecords: 0,
                studySessions: 0,
                achievements: 0,
                userAchievements: 0,
                pointsRecords: 0,
                exchangeRecords: 0,
                notifications: 0,
                operationLogs: 0,
                systemConfig: 0,
                errors: []
            };
            
            // 智能检测工作表并导入数据
            const sheetNames = Object.keys(workbook.Sheets);
            console.log('📋 检测到的工作表:', sheetNames);
            
            // 导入用户数据 - 支持多种工作表名称
            const userSheetNames = ['用户数据', '用户', 'Users', 'Sheet1'];
            const userSheet = userSheetNames.find(name => workbook.Sheets[name]);
            
            if (userSheet) {
                console.log(`📥 从工作表 "${userSheet}" 导入用户数据`);
                const usersData = XLSX.utils.sheet_to_json(workbook.Sheets[userSheet]);
                console.log(`📊 用户数据行数: ${usersData.length}`);
                
                for (const userData of usersData) {
                    try {
                        // 调试：显示当前处理的用户数据
                        console.log(`🔍 处理用户数据:`, userData);
                        
                        // 数据验证：检查必要字段
                        if (!userData['用户名'] || !userData['邮箱']) {
                            importStats.errors.push(`用户数据缺少必要字段: ${JSON.stringify(userData)}`);
                            continue;
                        }
                        
                        // 安全验证：检测恶意内容
                        try {
                            const { detectPrivilegeEscalation } = require('../middleware/security');
                            detectPrivilegeEscalation(userData['用户名']);
                            detectPrivilegeEscalation(userData['邮箱']);
                            if (userData['角色']) detectPrivilegeEscalation(userData['角色']);
                        } catch (error) {
                            logSecurityEvent(req, 'malicious_user_data_detected', {
                                field: error.message.includes('用户名') ? 'username' : 'email',
                                value: userData['用户名'] || userData['邮箱']
                            });
                            importStats.errors.push(`用户数据包含可疑内容: ${error.message}`);
                            continue;
                        }
                        
                        // 数据验证：邮箱格式
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(userData['邮箱'])) {
                            importStats.errors.push(`邮箱格式无效: ${userData['邮箱']}`);
                            continue;
                        }
                        
                        // 数据验证：用户名长度
                        if (userData['用户名'].length > 50) {
                            importStats.errors.push(`用户名过长: ${userData['用户名']}`);
                            continue;
                        }
                        
                        // 权限提升防护：允许导入admin用户但限制权限
                        if (userData['角色'] === '管理员' || userData['角色'] === 'admin') {
                            // 检查是否已存在同名管理员
                            const existingAdmin = await trx('users')
                                .where('username', userData['用户名'])
                                .where('role', 'admin')
                                .first();
                            
                            if (existingAdmin) {
                                // 跳过已存在的管理员用户，不报错
                                console.log(`跳过已存在的管理员用户: ${userData['用户名']}`);
                                continue;
                            }
                            
                            // 记录权限提升尝试但允许继续
                            logSecurityEvent(req, 'privilege_escalation_attempt', {
                                attemptedUsername: userData['用户名'],
                                attemptedRole: userData['角色']
                            });
                        }
                        
                        // 检查用户是否已存在
                        const existingUser = await trx('users')
                            .where('username', userData['用户名'])
                            .orWhere('email', userData['邮箱'])
                            .first();
                        
                        if (!existingUser) {
                            await trx('users').insert({
                                username: userData['用户名'].substring(0, 50), // 限制长度
                                email: userData['邮箱'].substring(0, 100), // 限制长度
                                role: userData['角色'] === '管理员' ? 'admin' : 'user',
                                is_active: userData['状态'] === '活跃',
                                created_at: parseDateTime(userData['创建时间']),
                                last_login_at: userData['最后登录'] !== '从未登录' ? parseDateTime(userData['最后登录']) : null
                            });
                            importStats.users++;
                        }
                    } catch (error) {
                        importStats.errors.push(`用户数据导入错误: ${userData['用户名']} - ${error.message}`);
                    }
                }
            }
            
            // 导入学习项目数据 - 支持多种工作表名称
            const projectSheetNames = ['学习项目', '项目', 'Projects', 'Sheet1'];
            const projectSheet = projectSheetNames.find(name => workbook.Sheets[name]);
            
            if (projectSheet) {
                console.log(`📥 从工作表 "${projectSheet}" 导入学习项目数据`);
                const projectsData = XLSX.utils.sheet_to_json(workbook.Sheets[projectSheet]);
                console.log(`📊 项目数据行数: ${projectsData.length}`);
                
                for (const projectData of projectsData) {
                    try {
                        // 调试：显示当前处理的项目数据
                        console.log(`🔍 处理项目数据:`, projectData);
                        
                        // 数据验证：检查必要字段
                        if (!projectData['项目名称'] || !projectData['用户ID']) {
                            importStats.errors.push(`项目数据缺少必要字段: ${JSON.stringify(projectData)}`);
                            continue;
                        }
                        
                        // 数据验证：项目名称长度
                        if (projectData['项目名称'].length > 200) {
                            importStats.errors.push(`项目名称过长: ${projectData['项目名称']}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', projectData['用户ID'])
                            .orWhere('id', projectData['用户ID'])
                            .first();
                        
                        console.log(`🔍 项目用户查找结果:`, {
                            searchUserId: projectData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            // 处理难度等级字段 - 支持数字和字符串
                            let difficultyLevel = 3; // 默认值
                            if (projectData['难度等级'] !== undefined && projectData['难度等级'] !== null) {
                                if (typeof projectData['难度等级'] === 'string') {
                                    difficultyLevel = parseInt(projectData['难度等级']) || 3;
                                } else {
                                    difficultyLevel = parseInt(projectData['难度等级']) || 3;
                                }
                            }
                            
                            await trx('study_projects').insert({
                                user_id: user.id,
                                name: projectData['项目名称'].substring(0, 200), // 限制长度
                                description: projectData['描述'] ? projectData['描述'].substring(0, 1000) : null, // 限制长度
                                category: projectData['分类'] ? projectData['分类'].substring(0, 100) : null, // 限制长度
                                difficulty_level: difficultyLevel,
                                estimated_hours: parseFloat(projectData['预计时长(小时)']) || 0,
                                actual_hours: parseFloat(projectData['实际时长(小时)']) || 0,
                                status: projectData['状态'] ? projectData['状态'].substring(0, 50) : '进行中', // 限制长度
                                start_date: projectData['开始日期'] ? parseDate(projectData['开始日期']) : null,
                                completion_date: projectData['完成日期'] ? parseDate(projectData['完成日期']) : null,
                                created_at: parseDateTime(projectData['创建时间'])
                            });
                            importStats.projects++;
                        }
                    } catch (error) {
                        importStats.errors.push(`项目数据导入错误: ${projectData['项目名称']} - ${error.message}`);
                    }
                }
            }
            
            // 导入学习记录数据 - 支持多种工作表名称
            const recordSheetNames = ['学习记录', '记录', 'Records', 'Sheet1'];
            const recordSheet = recordSheetNames.find(name => workbook.Sheets[name]);
            
            if (recordSheet) {
                console.log(`📥 从工作表 "${recordSheet}" 导入学习记录数据`);
                const studyRecordsData = XLSX.utils.sheet_to_json(workbook.Sheets[recordSheet]);
                console.log(`📊 学习记录行数: ${studyRecordsData.length}`);
                
                // 调试：显示前几行数据的字段名
                if (studyRecordsData.length > 0) {
                    console.log(`🔍 第一行数据字段:`, Object.keys(studyRecordsData[0]));
                    console.log(`🔍 第一行数据内容:`, studyRecordsData[0]);
                }
                
                for (const recordData of studyRecordsData) {
                    try {
                        // 调试：显示当前处理的学习记录数据
                        console.log(`🔍 处理学习记录数据:`, recordData);
                        
                        // 数据验证：检查必要字段 - 支持多种字段名
                        const projectName = recordData['项目名称'] || recordData['学习项目名称'] || recordData['项目名称'];
                        const userId = recordData['用户ID'] || recordData['用户名'] || 'admin'; // 默认使用admin用户
                        
                        console.log(`🔍 学习记录字段解析:`, {
                            projectName,
                            userId,
                            originalData: recordData
                        });
                        
                        if (!projectName) {
                            importStats.errors.push(`学习记录缺少项目名称字段: ${JSON.stringify(recordData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', userId)
                            .orWhere('id', userId)
                            .first();
                        
                        console.log(`🔍 学习记录用户查找结果:`, {
                            searchUserId: userId,
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            // 解析日期 - 支持多种格式
                            const dateStr = recordData['日期'] || recordData['学习日期'];
                            const startTime = recordData['开始时间'] || recordData['项目开始时间'];
                            const endTime = recordData['结束时间'] || recordData['项目结束时间'];
                            const duration = recordData['持续时间(分钟)'] || recordData['项目完成时间'] || 0;
                            
                            await trx('study_records').insert({
                                user_id: user.id,
                                date: parseDate(dateStr),
                                project_name: projectName.substring(0, 200), // 限制长度
                                start_time: startTime ? startTime.toString().substring(0, 50) : null, // 限制长度
                                end_time: endTime ? endTime.toString().substring(0, 50) : null, // 限制长度
                                duration: parseInt(duration) || 0,
                                category: recordData['分类'] ? recordData['分类'].substring(0, 100) : null, // 限制长度
                                difficulty: recordData['难度'] ? recordData['难度'].substring(0, 50) : null, // 限制长度
                                status: recordData['状态'] ? recordData['状态'].substring(0, 50) : '完成', // 限制长度
                                notes: recordData['备注'] ? recordData['备注'].substring(0, 1000) : null, // 限制长度
                                created_at: new Date()
                            });
                            importStats.studyRecords++;
                            console.log(`✅ 成功导入学习记录: ${projectName}`);
                        } else {
                            importStats.errors.push(`找不到用户: ${userId}`);
                        }
                    } catch (error) {
                        importStats.errors.push(`学习记录导入错误: ${recordData['项目名称']} - ${error.message}`);
                    }
                }
            }
            
            // 导入学习会话数据 - 支持多种工作表名称
            const sessionSheetNames = ['学习会话', '会话', 'Sessions', 'Sheet1'];
            const sessionSheet = sessionSheetNames.find(name => workbook.Sheets[name]);
            
            if (sessionSheet) {
                console.log(`📥 从工作表 "${sessionSheet}" 导入学习会话数据`);
                const studySessionsData = XLSX.utils.sheet_to_json(workbook.Sheets[sessionSheet]);
                console.log(`📊 学习会话行数: ${studySessionsData.length}`);
                
                for (const sessionData of studySessionsData) {
                    try {
                        // 调试：显示当前处理的数据
                        console.log(`🔍 处理学习会话数据:`, sessionData);
                        
                        // 数据验证：检查必要字段
                        if (!sessionData['用户ID']) {
                            importStats.errors.push(`学习会话缺少必要字段: ${JSON.stringify(sessionData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', sessionData['用户ID'])
                            .orWhere('id', sessionData['用户ID'])
                            .first();
                        
                        console.log(`🔍 用户查找结果:`, {
                            searchUserId: sessionData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            // 查找对应的项目ID（如果存在）
                            let projectId = null;
                            if (sessionData['项目ID']) {
                                const project = await trx('study_projects')
                                    .where('id', sessionData['项目ID'])
                                    .first();
                                projectId = project ? project.id : null;
                            }
                            
                            await trx('study_sessions').insert({
                                user_id: user.id,
                                project_id: projectId,
                                start_time: sessionData['开始时间'] ? (typeof sessionData['开始时间'] === 'string' ? parseDateTime(sessionData['开始时间']) : parseDateTime(sessionData['开始时间'])) : null,
                                end_time: sessionData['结束时间'] ? (typeof sessionData['结束时间'] === 'string' ? parseDateTime(sessionData['结束时间']) : parseDateTime(sessionData['结束时间'])) : null,
                                duration_hours: parseFloat(sessionData['持续时间(分钟)']) / 60 || 0, // 转换为小时
                                notes: sessionData['备注'] ? (typeof sessionData['备注'] === 'string' ? sessionData['备注'].substring(0, 1000) : String(sessionData['备注']).substring(0, 1000)) : null, // 限制长度
                                created_at: parseDateTime(sessionData['创建时间'])
                            });
                            importStats.studySessions++;
                        }
                    } catch (error) {
                        console.error('学习会话导入错误详情:', {
                            sessionData,
                            error: error.message,
                            stack: error.stack
                        });
                        importStats.errors.push(`学习会话导入错误: ${sessionData['学习日期']} - ${error.message}`);
                    }
                }
            }
            
            // 导入成就数据 - 支持多种工作表名称
            const achievementSheetNames = ['成就系统', '成就', 'Achievements', 'Sheet1'];
            const achievementSheet = achievementSheetNames.find(name => workbook.Sheets[name]);
            
            if (achievementSheet) {
                console.log(`📥 从工作表 "${achievementSheet}" 导入成就数据`);
                const achievementsData = XLSX.utils.sheet_to_json(workbook.Sheets[achievementSheet]);
                console.log(`📊 成就数据行数: ${achievementsData.length}`);
                
                for (const achievementData of achievementsData) {
                    try {
                        // 调试：显示当前处理的成就数据
                        console.log(`🔍 处理成就数据:`, achievementData);
                        
                        // 数据验证：检查必要字段
                        if (!achievementData['成就名称']) {
                            importStats.errors.push(`成就数据缺少必要字段: ${JSON.stringify(achievementData)}`);
                            continue;
                        }
                        
                        // 检查成就是否已存在
                        const existingAchievement = await trx('achievements')
                            .where('name', achievementData['成就名称'])
                            .first();
                        
                        console.log(`🔍 成就查找结果:`, {
                            achievementName: achievementData['成就名称'],
                            existingAchievement: existingAchievement ? { id: existingAchievement.id, name: existingAchievement.name } : null
                        });
                        
                        if (!existingAchievement) {
                            await trx('achievements').insert({
                                name: achievementData['成就名称'].substring(0, 100), // 限制长度
                                description: achievementData['描述'] ? achievementData['描述'].substring(0, 500) : null, // 限制长度
                                icon: achievementData['图标'] ? achievementData['图标'].substring(0, 200) : null, // 限制长度
                                trigger_type: achievementData['类型'] ? achievementData['类型'].substring(0, 50) : 'project_completion', // 限制长度
                                trigger_conditions: achievementData['条件'] ? JSON.stringify({ condition: achievementData['条件'] }) : null, // 限制长度
                                points: parseInt(achievementData['积分奖励']) || 0,
                                category_id: 1, // 默认分类
                                created_at: parseDateTime(achievementData['创建时间'])
                            });
                            importStats.achievements++;
                        }
                    } catch (error) {
                        importStats.errors.push(`成就数据导入错误: ${achievementData['成就名称']} - ${error.message}`);
                    }
                }
            }
            
            // 导入用户成就数据 - 支持多种工作表名称
            const userAchievementSheetNames = ['用户成就', '用户成就记录', 'UserAchievements', 'Sheet1'];
            const userAchievementSheet = userAchievementSheetNames.find(name => workbook.Sheets[name]);
            
            if (userAchievementSheet) {
                console.log(`📥 从工作表 "${userAchievementSheet}" 导入用户成就数据`);
                const userAchievementsData = XLSX.utils.sheet_to_json(workbook.Sheets[userAchievementSheet]);
                console.log(`📊 用户成就数据行数: ${userAchievementsData.length}`);
                
                for (const uaData of userAchievementsData) {
                    try {
                        // 调试：显示当前处理的用户成就数据
                        console.log(`🔍 处理用户成就数据:`, uaData);
                        
                        // 数据验证：检查必要字段
                        if (!uaData['用户ID'] || !uaData['成就ID']) {
                            importStats.errors.push(`用户成就数据缺少必要字段: ${JSON.stringify(uaData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户和成就
                        const user = await trx('users')
                            .where('username', uaData['用户ID'])
                            .orWhere('id', uaData['用户ID'])
                            .first();
                        
                        const achievement = await trx('achievements')
                            .where('name', uaData['成就ID'])
                            .orWhere('id', uaData['成就ID'])
                            .first();
                        
                        console.log(`🔍 用户成就查找结果:`, {
                            searchUserId: uaData['用户ID'],
                            searchAchievementId: uaData['成就ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null,
                            foundAchievement: achievement ? { id: achievement.id, name: achievement.name } : null
                        });
                        
                        if (user && achievement) {
                            // 检查是否已存在
                            const existingUA = await trx('user_achievements')
                                .where('user_id', user.id)
                                .where('achievement_id', achievement.id)
                                .first();
                            
                            if (!existingUA) {
                                await trx('user_achievements').insert({
                                    user_id: user.id,
                                    achievement_id: achievement.id,
                                    is_completed: true,
                                    completed_at: parseDateTime(uaData['获得时间']),
                                    current_progress: 1,
                                    completion_data: JSON.stringify({ imported: true })
                                });
                                importStats.userAchievements++;
                            }
                        }
                    } catch (error) {
                        importStats.errors.push(`用户成就导入错误: ${uaData['用户ID']} - ${error.message}`);
                    }
                }
            }
            
            // 导入积分记录数据 - 支持多种工作表名称
            const pointsSheetNames = ['积分记录', '积分', 'Points', 'Sheet1'];
            const pointsSheet = pointsSheetNames.find(name => workbook.Sheets[name]);
            
            if (pointsSheet) {
                console.log(`📥 从工作表 "${pointsSheet}" 导入积分记录数据`);
                const pointsRecordsData = XLSX.utils.sheet_to_json(workbook.Sheets[pointsSheet]);
                console.log(`📊 积分记录行数: ${pointsRecordsData.length}`);
                
                for (const recordData of pointsRecordsData) {
                    try {
                        // 调试：显示当前处理的积分记录数据
                        console.log(`🔍 处理积分记录数据:`, recordData);
                        
                        // 数据验证：检查必要字段
                        if (!recordData['用户ID']) {
                            importStats.errors.push(`积分记录缺少必要字段: ${JSON.stringify(recordData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', recordData['用户ID'])
                            .orWhere('id', recordData['用户ID'])
                            .first();
                        
                        console.log(`🔍 积分记录用户查找结果:`, {
                            searchUserId: recordData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            await trx('points_records').insert({
                                user_id: user.id,
                                points_change: parseInt(recordData['积分变化']) || 0,
                                record_type: recordData['变化类型'] ? recordData['变化类型'].substring(0, 50) : 'earned', // 限制长度，默认为earned
                                description: recordData['描述'] ? recordData['描述'].substring(0, 500) : null, // 限制长度
                                balance_after: parseInt(recordData['积分变化']) || 0, // 简化处理，实际应该计算余额
                                related_data: null, // 可选字段
                                created_at: parseDateTime(recordData['创建时间'])
                            });
                            importStats.pointsRecords++;
                        }
                    } catch (error) {
                        importStats.errors.push(`积分记录导入错误: ${recordData['用户ID']} - ${error.message}`);
                    }
                }
            }
            
            // 导入积分兑换记录数据 - 支持多种工作表名称
            const exchangeSheetNames = ['积分兑换', '兑换', 'Exchange', 'Sheet1'];
            const exchangeSheet = exchangeSheetNames.find(name => workbook.Sheets[name]);
            
            if (exchangeSheet) {
                console.log(`📥 从工作表 "${exchangeSheet}" 导入积分兑换记录数据`);
                const exchangeRecordsData = XLSX.utils.sheet_to_json(workbook.Sheets[exchangeSheet]);
                console.log(`📊 积分兑换记录行数: ${exchangeRecordsData.length}`);
                
                for (const exchangeData of exchangeRecordsData) {
                    try {
                        // 调试：显示当前处理的积分兑换数据
                        console.log(`🔍 处理积分兑换数据:`, exchangeData);
                        
                        // 数据验证：检查必要字段
                        if (!exchangeData['用户ID']) {
                            importStats.errors.push(`积分兑换记录缺少必要字段: ${JSON.stringify(exchangeData)}`);
                            continue;
                        }
                        
                        // 如果没有商品名称，尝试从描述中提取或使用默认值
                        let productName = exchangeData['商品名称'];
                        if (!productName && exchangeData['描述']) {
                            // 尝试从描述中提取商品名称
                            const description = exchangeData['描述'];
                            if (description.includes('兑换商品:')) {
                                productName = description.split('兑换商品:')[1].split('x')[0].trim();
                            } else if (description.includes('商品:')) {
                                productName = description.split('商品:')[1].split('x')[0].trim();
                            }
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', exchangeData['用户ID'])
                            .orWhere('id', exchangeData['用户ID'])
                            .first();
                        
                        console.log(`🔍 积分兑换用户查找结果:`, {
                            searchUserId: exchangeData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            // 查找对应的商品ID
                            let productId = null;
                            if (productName) {
                                const product = await trx('virtual_products')
                                    .where('name', productName)
                                    .first();
                                productId = product ? product.id : null;
                            }
                            
                            // 如果没有找到商品，尝试创建默认商品或跳过
                            if (!productId) {
                                if (productName) {
                                    importStats.errors.push(`找不到商品: ${productName}`);
                                    continue;
                                } else {
                                    // 如果没有商品名称，尝试使用默认商品
                                    const defaultProduct = await trx('virtual_products')
                                        .where('name', '学习报告')
                                        .first();
                                    if (defaultProduct) {
                                        productId = defaultProduct.id;
                                        console.log(`🔍 使用默认商品: 学习报告 (ID: ${productId})`);
                                    } else {
                                        importStats.errors.push(`积分兑换记录缺少商品名称且无默认商品: ${JSON.stringify(exchangeData)}`);
                                        continue;
                                    }
                                }
                            }
                            
                            await trx('exchange_records').insert({
                                user_id: user.id,
                                product_id: productId,
                                points_spent: parseInt(exchangeData['积分消耗']) || 0,
                                status: exchangeData['状态'] ? exchangeData['状态'].substring(0, 50) : 'pending', // 限制长度
                                approved_at: exchangeData['审批时间'] ? parseDateTime(exchangeData['审批时间']) : null,
                                approval_notes: exchangeData['审批备注'] ? exchangeData['审批备注'].substring(0, 500) : null, // 限制长度
                                created_at: parseDateTime(exchangeData['申请时间'])
                            });
                            importStats.exchangeRecords++;
                        }
                    } catch (error) {
                        importStats.errors.push(`积分兑换导入错误: ${exchangeData['商品名称']} - ${error.message}`);
                    }
                }
            }
            
            // 导入通知数据 - 支持多种工作表名称
            const notificationSheetNames = ['通知记录', '通知', 'Notifications', 'Sheet1'];
            const notificationSheet = notificationSheetNames.find(name => workbook.Sheets[name]);
            
            if (notificationSheet) {
                console.log(`📥 从工作表 "${notificationSheet}" 导入通知数据`);
                const notificationsData = XLSX.utils.sheet_to_json(workbook.Sheets[notificationSheet]);
                console.log(`📊 通知数据行数: ${notificationsData.length}`);
                
                for (const notificationData of notificationsData) {
                    try {
                        // 调试：显示当前处理的通知数据
                        console.log(`🔍 处理通知数据:`, notificationData);
                        
                        // 数据验证：检查必要字段
                        if (!notificationData['用户ID'] || !notificationData['标题']) {
                            importStats.errors.push(`通知记录缺少必要字段: ${JSON.stringify(notificationData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', notificationData['用户ID'])
                            .orWhere('id', notificationData['用户ID'])
                            .first();
                        
                        console.log(`🔍 通知用户查找结果:`, {
                            searchUserId: notificationData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            await trx('notifications').insert({
                                user_id: user.id,
                                title: notificationData['标题'].substring(0, 200), // 限制长度
                                message: notificationData['内容'] ? notificationData['内容'].substring(0, 1000) : '', // 限制长度，message是必填字段
                                type: notificationData['类型'] ? notificationData['类型'].substring(0, 50) : 'info', // 限制长度
                                read: notificationData['已读'] === '是',
                                created_at: parseDateTime(notificationData['创建时间'])
                            });
                            importStats.notifications++;
                        }
                    } catch (error) {
                        importStats.errors.push(`通知记录导入错误: ${notificationData['标题']} - ${error.message}`);
                    }
                }
            }
            
            // 导入操作日志数据 - 支持多种工作表名称
            const logSheetNames = ['操作日志', '日志', 'Logs', 'Sheet1'];
            const logSheet = logSheetNames.find(name => workbook.Sheets[name]);
            
            if (logSheet) {
                console.log(`📥 从工作表 "${logSheet}" 导入操作日志数据`);
                const operationLogsData = XLSX.utils.sheet_to_json(workbook.Sheets[logSheet]);
                console.log(`📊 操作日志行数: ${operationLogsData.length}`);
                
                for (const logData of operationLogsData) {
                    try {
                        // 调试：显示当前处理的操作日志数据
                        console.log(`🔍 处理操作日志数据:`, logData);
                        
                        // 数据验证：检查必要字段
                        if (!logData['操作类型'] || !logData['操作名称']) {
                            importStats.errors.push(`操作日志缺少必要字段: ${JSON.stringify(logData)}`);
                            continue;
                        }
                        
                        // 查找对应的用户ID
                        const user = await trx('users')
                            .where('username', logData['用户名'])
                            .orWhere('id', logData['用户ID'])
                            .first();
                        
                        console.log(`🔍 操作日志用户查找结果:`, {
                            searchUsername: logData['用户名'],
                            searchUserId: logData['用户ID'],
                            foundUser: user ? { id: user.id, username: user.username } : null
                        });
                        
                        if (user) {
                            await trx('data_operation_logs').insert({
                                operation_type: logData['操作类型'].substring(0, 50), // 限制长度
                                operation_name: logData['操作名称'].substring(0, 100), // 限制长度
                                description: logData['描述'] ? logData['描述'].substring(0, 500) : null, // 限制长度
                                user_id: user.id,
                                user_username: user.username,
                                status: logData['状态'] ? logData['状态'].substring(0, 50) : 'success', // 限制长度
                                error_message: logData['错误信息'] ? logData['错误信息'].substring(0, 500) : null, // 限制长度
                                details: null, // 可选字段
                                created_at: parseDateTime(logData['创建时间'])
                            });
                            importStats.operationLogs++;
                        }
                    } catch (error) {
                        importStats.errors.push(`操作日志导入错误: ${logData['操作名称']} - ${error.message}`);
                    }
                }
            }
            
            // 导入系统配置数据 - 支持多种工作表名称
            const configSheetNames = ['系统配置', '配置', 'Config', 'Sheet1'];
            const configSheet = configSheetNames.find(name => workbook.Sheets[name]);
            
            if (configSheet) {
                console.log(`📥 从工作表 "${configSheet}" 导入系统配置数据`);
                const systemConfigData = XLSX.utils.sheet_to_json(workbook.Sheets[configSheet]);
                console.log(`📊 系统配置行数: ${systemConfigData.length}`);
                
                for (const configData of systemConfigData) {
                    try {
                        // 调试：显示当前处理的系统配置数据
                        console.log(`🔍 处理系统配置数据:`, configData);
                        
                        // 数据验证：检查必要字段
                        if (!configData['配置键']) {
                            importStats.errors.push(`系统配置缺少必要字段: ${JSON.stringify(configData)}`);
                            continue;
                        }
                        
                        // 检查配置是否已存在
                        const existingConfig = await trx('system_config')
                            .where('key', configData['配置键'])
                            .first();
                        
                        console.log(`🔍 系统配置查找结果:`, {
                            configKey: configData['配置键'],
                            existingConfig: existingConfig ? { key: existingConfig.key, value: existingConfig.value } : null
                        });
                        
                        if (!existingConfig) {
                            await trx('system_config').insert({
                                key: configData['配置键'].substring(0, 100), // 限制长度
                                value: configData['配置值'] ? configData['配置值'].substring(0, 1000) : null, // 限制长度
                                description: configData['描述'] ? configData['描述'].substring(0, 500) : null, // 限制长度
                                type: configData['类型'] ? configData['类型'].substring(0, 50) : null, // 限制长度
                                created_at: parseDateTime(configData['创建时间'])
                            });
                            importStats.systemConfig++;
                        }
                    } catch (error) {
                        importStats.errors.push(`系统配置导入错误: ${configData['配置键']} - ${error.message}`);
                    }
                }
            }
            
            await trx.commit();
            
            // 更新导入频率计数
            req.session[importKey] = (req.session[importKey] || 0) + 1;
            
            // 记录成功的安全事件
            logSecurityEvent(req, 'data_import_success', {
                fileName: Buffer.from(file.name, 'latin1').toString('utf8'),
                importStats: importStats
            });
            
            // 记录操作日志
            await db('data_operation_logs').insert({
                operation_type: 'import',
                operation_name: '数据导入恢复',
                description: `管理员 ${req.user.username} 执行了数据导入恢复，文件: ${Buffer.from(file.name, 'latin1').toString('utf8')}`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'success',
                details: JSON.stringify(importStats),
                created_at: new Date()
            });
            
            res.json({
                success: true,
                message: '数据导入恢复成功！',
                data: importStats
            });
            
        } catch (error) {
            await trx.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Admin API import error:', error);
        
        // 记录安全事件
        logSecurityEvent(req, 'data_import_failed', {
            error: error.message,
            fileName: req.files?.backupFile?.name ? Buffer.from(req.files.backupFile.name, 'latin1').toString('utf8') : '未知文件'
        });
        
        // 记录错误日志
        try {
            await db('data_operation_logs').insert({
                operation_type: 'import',
                operation_name: '数据导入恢复',
                description: `管理员 ${req.user.username} 执行数据导入恢复失败`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'failed',
                error_message: error.message,
                created_at: new Date()
            });
        } catch (logError) {
            console.error('记录操作日志失败:', logError);
        }
        
        res.status(500).json({
            success: false,
            error: '数据导入恢复失败: ' + error.message
        });
    }
});

// 辅助函数：解析日期
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        // 已经是 Date 对象
        if (dateStr instanceof Date && !isNaN(dateStr)) {
            return dateStr;
        }
        // 数字型（Excel序列号）
        if (typeof dateStr === 'number') {
            // Excel日期序列号转JS日期（以1900为基准）
            return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
        }
        // 字符串型
        if (typeof dateStr === 'string') {
            // ISO格式
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
                const d = new Date(dateStr);
                if (!isNaN(d)) return d;
            }
            // yyyy/MM/dd 或 yyyy-MM-dd
            const match = dateStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
            if (match) {
                const [, year, month, day] = match;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // 纯数字8位 20250711
            if (/^\d{8}$/.test(dateStr)) {
                return new Date(
                    parseInt(dateStr.slice(0, 4)),
                    parseInt(dateStr.slice(4, 6)) - 1,
                    parseInt(dateStr.slice(6, 8))
                );
            }
        }
        // 兜底尝试
        const d = new Date(dateStr);
        if (!isNaN(d)) return d;
        return null;
    } catch (error) {
        console.warn('日期解析失败:', dateStr, error);
        return null;
    }
}

// 辅助函数：解析日期时间
function parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return new Date();
    try {
        // 已经是 Date 对象
        if (dateTimeStr instanceof Date && !isNaN(dateTimeStr)) {
            return dateTimeStr;
        }
        // 数字型（Excel序列号）
        if (typeof dateTimeStr === 'number') {
            return new Date(Math.round((dateTimeStr - 25569) * 86400 * 1000));
        }
        // 字符串型
        if (typeof dateTimeStr === 'string') {
            // ISO格式
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateTimeStr)) {
                const d = new Date(dateTimeStr);
                if (!isNaN(d)) return d;
            }
            // yyyy/MM/dd HH:mm:ss 或 yyyy-MM-dd HH:mm:ss
            const match = dateTimeStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
            if (match) {
                const [, year, month, day, hour, minute, second] = match;
                return new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    second ? parseInt(second) : 0
                );
            }
            // 纯数字8位 20250711
            if (/^\d{8}$/.test(dateTimeStr)) {
                return new Date(
                    parseInt(dateTimeStr.slice(0, 4)),
                    parseInt(dateTimeStr.slice(4, 6)) - 1,
                    parseInt(dateTimeStr.slice(6, 8))
                );
            }
        }
        // 兜底尝试
        const d = new Date(dateTimeStr);
        if (!isNaN(d)) return d;
        return new Date();
    } catch (error) {
        console.warn('日期时间解析失败:', dateTimeStr, error);
        return new Date();
    }
}

// GET方法数据备份API - 导出Excel文件
router.get('/data/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('开始数据备份...');
        
        // 引入XLSX库
        const XLSX = require('xlsx');
        
        // 获取所有用户数据
        const users = await db('users')
            .select('id', 'username', 'email', 'role', 'is_active', 'created_at', 'last_login_at')
            .orderBy('created_at', 'desc');
        
        // 获取所有学习项目数据
        const projects = await db('study_projects')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取所有学习记录数据
        const studyRecords = await db('study_records')
            .select('*')
            .orderBy('date', 'desc')
            .orderBy('created_at', 'desc');
        
        // 获取所有学习会话数据
        const studySessions = await db('study_sessions')
            .select('*')
            .orderBy('study_date', 'desc')
            .orderBy('created_at', 'desc');
        
        // 获取所有成就数据
        const achievements = await db('achievements')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取所有用户成就数据
        const userAchievements = await db('user_achievements')
            .select('*')
            .orderBy('earned_at', 'desc');
        
        // 获取所有积分记录数据
        const pointsRecords = await db('points_records')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取所有积分兑换记录数据
        const exchangeRecords = await db('exchange_records')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取所有通知数据
        const notifications = await db('notifications')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取所有操作日志数据
        const operationLogs = await db('data_operation_logs')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 获取系统配置数据
        const systemConfig = await db('system_config')
            .select('*')
            .orderBy('created_at', 'desc');
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        
        // 转换用户数据格式
        const usersData = users.map(user => ({
            '用户ID': user.id,
            '用户名': user.username,
            '邮箱': user.email,
            '角色': user.role,
            '状态': user.is_active ? '活跃' : '非活跃',
            '创建时间': new Date(user.created_at).toLocaleString('zh-CN'),
            '最后登录': user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '从未登录'
        }));
        
        // 转换学习项目数据格式
        const projectsData = projects.map(project => ({
            '项目ID': project.id,
            '用户ID': project.user_id,
            '项目名称': project.name,
            '描述': project.description || '',
            '分类': project.category,
            '难度等级': project.difficulty_level,
            '预计时长(小时)': project.estimated_hours,
            '实际时长(小时)': project.actual_hours || 0,
            '状态': project.status,
            '开始日期': project.start_date ? new Date(project.start_date).toLocaleDateString('zh-CN') : '',
            '完成日期': project.completion_date ? new Date(project.completion_date).toLocaleDateString('zh-CN') : '',
            '创建时间': new Date(project.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换学习记录数据格式
        const studyRecordsData = studyRecords.map(record => ({
            '记录ID': record.id,
            '用户ID': record.user_id,
            '日期': record.date,
            '项目名称': record.project_name,
            '开始时间': record.start_time,
            '结束时间': record.end_time,
            '持续时间(分钟)': record.duration,
            '分类': record.category || '',
            '难度': record.difficulty || '',
            '状态': record.status || '',
            '备注': record.notes || '',
            '创建时间': new Date(record.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换学习会话数据格式
        const studySessionsData = studySessions.map(session => ({
            '会话ID': session.id,
            '用户ID': session.user_id,
            '项目ID': session.project_id,
            '学习日期': session.study_date,
            '开始时间': session.start_time,
            '结束时间': session.end_time,
            '持续时间(分钟)': session.duration,
            '备注': session.notes || '',
            '创建时间': new Date(session.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换成就数据格式
        const achievementsData = achievements.map(achievement => ({
            '成就ID': achievement.id,
            '成就名称': achievement.name,
            '描述': achievement.description,
            '图标': achievement.icon,
            '类型': achievement.type,
            '条件': achievement.condition,
            '积分奖励': achievement.points_reward,
            '创建时间': new Date(achievement.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换用户成就数据格式
        const userAchievementsData = userAchievements.map(ua => ({
            '用户成就ID': ua.id,
            '用户ID': ua.user_id,
            '成就ID': ua.achievement_id,
            '获得时间': new Date(ua.earned_at).toLocaleString('zh-CN')
        }));
        
        // 转换积分记录数据格式
        const pointsRecordsData = pointsRecords.map(record => ({
            '记录ID': record.id,
            '用户ID': record.user_id,
            '积分变化': record.points_change,
            '变化类型': record.change_type,
            '描述': record.description,
            '创建时间': new Date(record.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换积分兑换记录数据格式
        const exchangeRecordsData = exchangeRecords.map(exchange => ({
            '兑换ID': exchange.id,
            '用户ID': exchange.user_id,
            '商品名称': exchange.product_name,
            '积分消耗': exchange.points_cost,
            '数量': exchange.quantity || 1,
            '状态': exchange.status,
            '申请时间': new Date(exchange.created_at).toLocaleString('zh-CN'),
            '审批时间': exchange.approved_at ? new Date(exchange.approved_at).toLocaleString('zh-CN') : '',
            '审批备注': exchange.approval_notes || ''
        }));
        
        // 转换通知数据格式
        const notificationsData = notifications.map(notification => ({
            '通知ID': notification.id,
            '用户ID': notification.user_id,
            '标题': notification.title,
            '内容': notification.content,
            '类型': notification.type,
            '已读': notification.is_read ? '是' : '否',
            '创建时间': new Date(notification.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换操作日志数据格式
        const operationLogsData = operationLogs.map(log => ({
            '日志ID': log.id,
            '操作类型': log.operation_type,
            '操作名称': log.operation_name,
            '描述': log.description || '',
            '用户ID': log.user_id,
            '用户名': log.user_username,
            '状态': log.status,
            '错误信息': log.error_message || '',
            '创建时间': new Date(log.created_at).toLocaleString('zh-CN')
        }));
        
        // 转换系统配置数据格式
        const systemConfigData = systemConfig.map(config => ({
            '配置键': config.key,
            '配置值': config.value,
            '描述': config.description,
            '类型': config.type,
            '创建时间': new Date(config.created_at).toLocaleString('zh-CN')
        }));
        
        // 创建工作表
        const sheets = [
            { name: '用户数据', data: usersData },
            { name: '学习项目', data: projectsData },
            { name: '学习记录', data: studyRecordsData },
            { name: '学习会话', data: studySessionsData },
            { name: '成就系统', data: achievementsData },
            { name: '用户成就', data: userAchievementsData },
            { name: '积分记录', data: pointsRecordsData },
            { name: '积分兑换', data: exchangeRecordsData },
            { name: '通知记录', data: notificationsData },
            { name: '操作日志', data: operationLogsData },
            { name: '系统配置', data: systemConfigData }
        ];
        
        // 添加所有工作表到工作簿
        sheets.forEach(sheet => {
            if (sheet.data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(sheet.data);
                
                // 设置列宽
                const colWidths = Object.keys(sheet.data[0]).map(key => ({
                    wch: Math.max(key.length * 2, 15)
                }));
                worksheet['!cols'] = colWidths;
                
                XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
            }
        });
        
        // 生成Excel文件
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // 记录操作日志
        await db('data_operation_logs').insert({
            operation_type: 'backup',
            operation_name: '数据备份',
            description: `管理员 ${req.user.username} 执行了系统数据备份，共导出 ${sheets.length} 个数据表`,
            user_id: req.user.id,
            user_username: req.user.username,
            status: 'success',
            created_at: new Date()
        });
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        // 使用英文文件名，避免HTTP头字符编码问题
        const fileName = `study_data_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent('系统数据备份_' + new Date().toISOString().split('T')[0] + '.xlsx')}`);
        
        console.log('数据备份完成，文件大小:', excelBuffer.length, '字节');
        
        // 发送文件
        res.send(excelBuffer);
        
    } catch (error) {
        console.error('Admin API backup error:', error);
        
        // 记录错误日志
        try {
            await db('data_operation_logs').insert({
                operation_type: 'backup',
                operation_name: '数据备份',
                description: `管理员 ${req.user.username} 执行数据备份失败`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'failed',
                error_message: error.message,
                created_at: new Date()
            });
        } catch (logError) {
            console.error('记录操作日志失败:', logError);
        }
        
        res.status(500).json({
            success: false,
            error: '数据备份失败: ' + error.message
        });
    }
});

// 数据清理API
router.post('/data/clean', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('开始数据清理...');
        
        // 开始事务
        const trx = await db.transaction();
        
        try {
            // 清理过期的学习记录（30天前的）
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const deletedRecords = await trx('study_records')
                .where('created_at', '<', thirtyDaysAgo)
                .del();
            
            // 清理过期的学习会话（30天前的）
            const deletedSessions = await trx('study_sessions')
                .where('created_at', '<', thirtyDaysAgo)
                .del();
            
            // 清理过期的通知（7天前的已读通知）
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const deletedNotifications = await trx('notifications')
                .where('is_read', true)
                .where('created_at', '<', sevenDaysAgo)
                .del();
            
            await trx.commit();
            
            // 记录操作日志
            await db('data_operation_logs').insert({
                operation_type: 'clean',
                operation_name: '数据清理',
                description: `管理员 ${req.user.username} 执行了数据清理，删除了 ${deletedRecords} 条过期学习记录，${deletedSessions} 条过期学习会话，${deletedNotifications} 条过期通知`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'success',
                details: JSON.stringify({
                    deletedRecords,
                    deletedSessions,
                    deletedNotifications,
                    cleanupDate: new Date().toISOString()
                }),
                created_at: new Date()
            });
            
            res.json({
                success: true,
                message: `数据清理成功！删除了 ${deletedRecords} 条过期学习记录，${deletedSessions} 条过期学习会话，${deletedNotifications} 条过期通知`,
                data: {
                    deletedRecords,
                    deletedSessions,
                    deletedNotifications
                }
            });
            
        } catch (error) {
            await trx.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Admin API clean error:', error);
        
        // 记录错误日志
        try {
            await db('data_operation_logs').insert({
                operation_type: 'clean',
                operation_name: '数据清理',
                description: `管理员 ${req.user.username} 执行数据清理失败`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'failed',
                error_message: error.message,
                created_at: new Date()
            });
        } catch (logError) {
            console.error('记录操作日志失败:', logError);
        }
        
        res.status(500).json({
            success: false,
            error: '数据清理失败: ' + error.message
        });
    }
});

// 数据重置API
router.post('/data/reset', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('开始数据重置...');
        
        // 开始事务
        const trx = await db.transaction();
        
        try {
            // 获取重置前的数据统计
            const statsBefore = {
                users: await trx('users').count('* as count').first(),
                projects: await trx('study_projects').count('* as count').first(),
                records: await trx('study_records').count('* as count').first(),
                sessions: await trx('study_sessions').count('* as count').first(),
                achievements: await trx('user_achievements').count('* as count').first(),
                points: await trx('points_records').count('* as count').first(),
                exchanges: await trx('exchange_records').count('* as count').first(),
                notifications: await trx('notifications').count('* as count').first()
            };
            
            // 保留管理员用户，删除其他所有数据
            const adminUsers = await trx('users').where('role', 'admin').select('id');
            const adminUserIds = adminUsers.map(u => u.id);
            
            // 删除非管理员用户的所有数据
            await trx('study_sessions').whereNotIn('user_id', adminUserIds).del();
            await trx('study_records').whereNotIn('user_id', adminUserIds).del();
            await trx('study_projects').whereNotIn('user_id', adminUserIds).del();
            await trx('user_achievements').whereNotIn('user_id', adminUserIds).del();
            await trx('points_records').whereNotIn('user_id', adminUserIds).del();
            await trx('exchange_records').whereNotIn('user_id', adminUserIds).del();
            await trx('notifications').whereNotIn('user_id', adminUserIds).del();
            await trx('notification_settings').whereNotIn('user_id', adminUserIds).del();
            
            // 删除非管理员用户
            await trx('users').whereNotIn('id', adminUserIds).del();
            
            await trx.commit();
            
            // 记录操作日志
            await db('data_operation_logs').insert({
                operation_type: 'reset',
                operation_name: '数据重置',
                description: `管理员 ${req.user.username} 执行了系统数据重置，删除了所有非管理员用户数据`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'success',
                details: JSON.stringify({
                    statsBefore,
                    adminUsersKept: adminUserIds.length,
                    resetDate: new Date().toISOString()
                }),
                created_at: new Date()
            });
            
            res.json({
                success: true,
                message: '数据重置成功！已删除所有非管理员用户数据',
                data: {
                    adminUsersKept: adminUserIds.length,
                    statsBefore
                }
            });
            
        } catch (error) {
            await trx.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Admin API reset error:', error);
        
        // 记录错误日志
        try {
            await db('data_operation_logs').insert({
                operation_type: 'reset',
                operation_name: '数据重置',
                description: `管理员 ${req.user.username} 执行数据重置失败`,
                user_id: req.user.id,
                user_username: req.user.username,
                status: 'failed',
                error_message: error.message,
                created_at: new Date()
            });
        } catch (logError) {
            console.error('记录操作日志失败:', logError);
        }
        
        res.status(500).json({
            success: false,
            error: '数据重置失败: ' + error.message
        });
    }
});

// 生成测试数据API
router.post('/testdata/generate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            projectCount = 10, 
            projectType = 'study', 
            recordCount = 100, 
            timeRange = 30,
            dailyRecords = 3,
            minDuration = 30,
            maxDuration = 180,
            mode = 'append' // 'append' 或 'overwrite'
        } = req.body;

        console.log('=== 开始生成测试数据 ===');
        console.log('参数:', { projectCount, projectType, recordCount, timeRange, dailyRecords, minDuration, maxDuration, mode });

        // 开始事务
        const trx = await db.transaction();

        try {
            // 如果是覆盖模式，先清理之前的测试数据
            if (mode === 'overwrite') {
                console.log('覆盖模式：清理之前的测试数据');
                
                // 删除测试项目的学习记录
                await trx('study_records')
                    .where('project_name', 'like', '测试_%')
                    .del();
                
                // 删除测试项目
                await trx('study_projects')
                    .where('name', 'like', '测试_%')
                    .del();
                
                console.log('已清理之前的测试数据');
            }

            // 生成测试项目名称
            const testProjectNames = [];
            const projectTypes = {
                'study': ['学习', '复习', '练习', '研究', '探索', '掌握', '理解', '应用', '分析', '创造'],
                'work': ['工作', '开发', '设计', '测试', '部署', '维护', '优化', '重构', '调试', '集成'],
                'personal': ['个人', '兴趣', '爱好', '技能', '知识', '能力', '成长', '提升', '突破', '创新'],
                'research': ['研究', '调查', '分析', '实验', '验证', '探索', '发现', '创新', '突破', '总结']
            };

            const typeNames = projectTypes[projectType] || projectTypes['study'];
            
            // 获取已存在的测试项目名称，避免重复
            const existingTestProjects = await trx('study_projects')
                .where('name', 'like', '测试_%')
                .select('name');
            
            const existingNames = new Set(existingTestProjects.map(p => p.name));
            
            let projectIndex = 0;
            let suffix = 1;
            
            while (testProjectNames.length < projectCount) {
                const baseName = typeNames[projectIndex % typeNames.length];
                const projectName = `测试_${baseName}项目${suffix > 1 ? suffix : ''}`;
                
                // 如果项目名称已存在，增加后缀
                if (existingNames.has(projectName)) {
                    suffix++;
                    continue;
                }
                
                testProjectNames.push(projectName);
                existingNames.add(projectName); // 添加到已存在集合中，避免本次生成中重复
                projectIndex++;
                
                // 如果当前类型名称用完了，重置索引并增加后缀
                if (projectIndex % typeNames.length === 0) {
                    suffix++;
                }
            }

            console.log('生成的测试项目名称:', testProjectNames);

            // 插入测试项目
            const defaultRatingStandards = JSON.stringify({
              excellent: { max: 60 },
              good: { min: 60, max: 120 },
              medium: { min: 120, max: 180 },
              poor: { min: 180 }
            });
            const projects = testProjectNames.map(projectName => ({
                user_id: req.user.id,
                name: projectName,
                description: `这是自动生成的测试项目：${projectName}`,
                start_date: new Date(),
                completion_date: null,
                // 预估时间：60-180分钟（严格受控）
                estimated_hours: (Math.floor(Math.random() * 121) + 60) / 60, // 60-180分钟转换为小时
                actual_hours: 0,
                difficulty_level: Math.floor(Math.random() * 5) + 1, // 1-5级
                status: 'in_progress',
                category: projectType,
                notes: '自动生成的测试数据',
                rating_standards: defaultRatingStandards,
                created_at: new Date(),
                updated_at: new Date()
            }));

            const insertedProjects = await trx('study_projects').insert(projects, ['id']);
            // 修正：提取id为数字数组
            const projectIds = insertedProjects.map(p => p.id);

            console.log('已创建测试项目，ID:', projectIds);

            // 生成测试学习记录
            const recordsToInsert = [];
            const sessionsToInsert = [];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeRange);

            // 为每个项目生成学习记录
            for (let day = 0; day < timeRange; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + day);

                // 每天生成指定数量的记录
                for (let record = 0; record < dailyRecords; record++) {
                    const projectIndex = Math.floor(Math.random() * projectIds.length);
                    const projectName = testProjectNames[projectIndex];

                    // 生成随机起始时间（8:00-20:00）
                    const maxMinutes = 23 * 60 + 59; // 1439分钟
                    let startMinutes = Math.floor(Math.random() * (maxMinutes + 1));
                    let endMinutes = Math.floor(Math.random() * (maxMinutes + 1));
                    
                    // 确保结束时间在开始时间之后
                    if (endMinutes <= startMinutes) {
                        const temp = startMinutes;
                        startMinutes = endMinutes;
                        endMinutes = temp;
                    }
                    
                    // 计算时长
                    const duration = endMinutes - startMinutes;
                    
                    // 检查时长是否在指定范围内
                    if (duration < minDuration || duration > maxDuration) {
                        continue; // 超出范围则跳过
                    }
                    
                    // 生成时间字符串
                    const startHour = Math.floor(startMinutes / 60);
                    const startMinute = startMinutes % 60;
                    const endHour = Math.floor(endMinutes / 60);
                    const endMinute = endMinutes % 60;
                    
                    const start_time = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
                    const end_time = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

                    // 插入到 study_records 表（用于数据导入导出）
                    recordsToInsert.push({
                        user_id: req.user.id,
                        date: currentDate.toISOString().split('T')[0],
                        project_name: projectName,
                        start_time: start_time,
                        end_time: end_time,
                        duration: duration,
                        notes: `测试记录 ${record + 1}`,
                        category: projectType,
                        difficulty: ['简单', '中等', '困难'][Math.floor(Math.random() * 3)],
                        status: 'completed',
                        created_at: new Date(),
                        updated_at: new Date()
                    });

                    // 同时插入到 study_sessions 表（用于前端显示）
                    sessionsToInsert.push({
                        user_id: req.user.id,
                        project_id: projectIds[projectIndex],
                        study_date: currentDate.toISOString().split('T')[0],
                        project_name: projectName,
                        start_time_new: start_time, // 字符串格式，数据库会自动转换
                        end_time_new: end_time, // 字符串格式，数据库会自动转换
                        start_time: new Date(`${currentDate.toISOString().split('T')[0]}T${start_time}:00.000Z`), // 转换为 timestamp
                        end_time: new Date(`${currentDate.toISOString().split('T')[0]}T${end_time}:00.000Z`), // 转换为 timestamp
                        duration: duration,
                        duration_hours: duration / 60,
                        notes: `测试记录 ${record + 1}`,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            }

            // 批量插入学习记录到两个表
            if (recordsToInsert.length > 0) {
                await trx('study_records').insert(recordsToInsert);
                console.log(`已插入 ${recordsToInsert.length} 条测试学习记录到 study_records 表`);
            }

            if (sessionsToInsert.length > 0) {
                await trx('study_sessions').insert(sessionsToInsert);
                console.log(`已插入 ${sessionsToInsert.length} 条测试学习记录到 study_sessions 表`);
            }

            // 更新项目的实际学习时间
            for (let i = 0; i < projectIds.length; i++) {
                const projectId = projectIds[i];
                const projectName = testProjectNames[i];
                
                const projectRecords = await trx('study_records')
                    .where('project_name', projectName);

                const totalDuration = projectRecords.reduce((sum, record) => sum + record.duration, 0);
                const actualHours = Math.round((totalDuration / 60) * 100) / 100;

                await trx('study_projects')
                    .where('id', projectId)
                    .update({
                        actual_hours: actualHours,
                        updated_at: new Date()
                    });
            }

            await trx.commit();

            console.log('=== 测试数据生成完成 ===');
            console.log(`创建了 ${projectIds.length} 个测试项目`);
            console.log(`生成了 ${recordsToInsert.length} 条学习记录`);

            res.json({
                success: true,
                message: `测试数据生成成功！创建了 ${projectIds.length} 个测试项目，生成了 ${recordsToInsert.length} 条学习记录`,
                data: {
                    projectsCreated: projectIds.length,
                    recordsCreated: recordsToInsert.length,
                    projectNames: testProjectNames
                }
            });

        } catch (error) {
            await trx.rollback();
            throw error;
        }

    } catch (error) {
        console.error('生成测试数据失败:', error);
        res.status(500).json({
            success: false,
            error: '生成测试数据失败: ' + error.message
        });
    }
});

// 清理测试数据API
router.post('/testdata/clear', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('=== 开始清理测试数据 ===');

        // 开始事务
        const trx = await db.transaction();

        try {
            // 1. 先获取所有测试项目的ID和名称
            const testProjects = await trx('study_projects')
                .where('name', 'like', '测试_%')
                .select('id', 'name');

            const testProjectIds = testProjects.map(p => p.id);
            const testProjectNames = testProjects.map(p => p.name);

            console.log('找到测试项目:', testProjectNames);

            // 2. 删除测试项目的学习记录（study_records）
            const deletedRecords = await trx('study_records')
                .where(function() {
                    this.where('project_name', 'like', '测试_%')
                        .orWhereIn('project_name', testProjectNames);
                })
                .del();

            // 3. 删除测试项目的学习会话（study_sessions）
            const deletedSessions = await trx('study_sessions')
                .where(function() {
                    this.where('project_name', 'like', '测试_%')
                        .orWhereIn('project_name', testProjectNames)
                        .orWhereIn('project_id', testProjectIds);
                })
                .del();

            // 4. 删除测试项目
            const deletedProjects = await trx('study_projects')
                .where('name', 'like', '测试_%')
                .del();

            // 5. 清理可能存在的"未知项目"记录
            const deletedUnknownRecords = await trx('study_records')
                .where('project_name', 'like', '%未知%')
                .del();

            const deletedUnknownSessions = await trx('study_sessions')
                .where('project_name', 'like', '%未知%')
                .del();

            await trx.commit();

            console.log('=== 测试数据清理完成 ===');
            console.log(`删除了 ${deletedProjects} 个测试项目`);
            console.log(`删除了 ${deletedRecords} 条测试学习记录（study_records）`);
            console.log(`删除了 ${deletedSessions} 条测试学习记录（study_sessions）`);
            console.log(`删除了 ${deletedUnknownRecords} 条未知项目记录（study_records）`);
            console.log(`删除了 ${deletedUnknownSessions} 条未知项目记录（study_sessions）`);

            res.json({
                success: true,
                message: `测试数据清理成功！删除了 ${deletedProjects} 个测试项目，${deletedRecords + deletedSessions + deletedUnknownRecords + deletedUnknownSessions} 条学习记录`,
                data: {
                    projectsDeleted: deletedProjects,
                    recordsDeleted: deletedRecords + deletedSessions + deletedUnknownRecords + deletedUnknownSessions,
                    testRecords: deletedRecords,
                    testSessions: deletedSessions,
                    unknownRecords: deletedUnknownRecords,
                    unknownSessions: deletedUnknownSessions
                }
            });

        } catch (error) {
            await trx.rollback();
            throw error;
        }

    } catch (error) {
        console.error('清理测试数据失败:', error);
        res.status(500).json({
            success: false,
            error: '清理测试数据失败: ' + error.message
        });
    }
});

// 统计信息
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await dbModule.getAdminStats();
        res.render('admin/stats', {
            title: '统计信息',
            stats,
            currentPage: 'admin-stats'
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载统计信息时出错'
        });
    }
});

// 动态渲染管理后台各 tab 页面
router.get('/page/:tab', authenticateToken, requireAdmin, async (req, res) => {
    const tab = req.params.tab;
    try {
        switch (tab) {
            case 'users': {
                const users = await dbModule.getAllUsers();
                
                // 过滤demo用户：demo账号只出现在演示环境中，对admin不可见
                const isDemoApi = req.originalUrl && req.originalUrl.startsWith('/demo/api');
                let filteredUsers = users;
                
                if (isDemoApi) {
                    // 演示环境：只显示demo用户
                    filteredUsers = users.filter(user => 
                        user.username.startsWith('demo_') || 
                        user.username.includes('demo') ||
                        user.username.includes('test_') ||
                        user.username === 'test_student' ||
                        user.username === 'study_enthusiast'
                    );
                    logger.info('演示环境：用户管理页面只显示demo用户');
                } else {
                    // 非演示环境（包括生产环境和开发环境）：过滤掉demo用户
                    filteredUsers = users.filter(user => 
                        !user.username.startsWith('demo_') && 
                        !user.username.includes('demo') &&
                        !user.username.includes('test_') &&
                        user.username !== 'test_student' &&
                        user.username !== 'study_enthusiast'
                    );
                    logger.info('非演示环境：用户管理页面已过滤demo用户');
                }
                
                return res.render('admin/users', { title: '用户管理', users: filteredUsers, currentPage: 'admin-users' , layout: false });
            }
            case 'data': {
                const dataStats = await dbModule.getDataStats();
                return res.render('admin/data', { title: '数据管理', dataStats, currentPage: 'admin-data', layout: false });
            }
            case 'achievements': {
                const achievements = await dbModule.getAllAchievements();
                return res.render('admin/achievements', { title: '成就管理', achievements, currentPage: 'admin-achievements', layout: false });
            }
            case 'config': {
                const config = await dbModule.getSystemConfig();
                return res.render('admin/config', { title: '系统配置', config, currentPage: 'admin-config', layout: false });
            }
            case 'data-management': {
                // 渲染数据管理 tab 的内容
                return res.render('admin/data-management', { title: '数据管理', currentPage: 'admin-data-management', layout: false });
            }
            case 'points-exchange': {
                const exchangeRecords = await dbModule.getExchangeRecords();
                return res.render('admin/points-exchange', { title: '积分兑换管理', exchangeRecords, currentPage: 'admin-points-exchange', layout: false });
            }
            case 'exchange-approval': {
                const pendingRecords = await dbModule.getPendingExchangeRecords();
                return res.render('admin/exchange-approval', { title: '兑换审批', pendingRecords, currentPage: 'admin-exchange-approval', layout: false });
            }
            case 'smtp-config': {
                const smtpConfig = await dbModule.getSMTPConfig();
                return res.render('admin/smtp-config', { title: 'SMTP 配置', smtpConfig, currentPage: 'admin-smtp-config', layout: false });
            }
            case 'stats': {
                const stats = await dbModule.getAdminStats();
                return res.render('admin/stats', { title: '统计信息', stats, currentPage: 'admin-stats', layout: false });
            }
            default:
                return res.status(404).send('Tab Not Found');
        }
    } catch (error) {
        console.error(`Admin page ${tab} error:`, error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: `加载${tab}页面时出错`,
            layout: false
        });
    }
});

// 成就管理API路由

// 获取成就分类列表
router.get('/achievement-categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const categories = await db('achievement_categories')
            .select('*')
            .orderBy('sort_order', 'asc')
            .orderBy('name', 'asc');
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('获取成就分类失败:', error);
        res.status(500).json({
            success: false,
            error: '获取成就分类失败'
        });
    }
});

// 获取成就列表
router.get('/achievements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = db('achievements')
            .leftJoin('achievement_categories', 'achievements.category_id', 'achievement_categories.id')
            .select(
                'achievements.*',
                'achievement_categories.name as category_name'
            );
        
        // 搜索过滤
        if (search) {
            query = query.where(function() {
                this.where('achievements.name', 'like', `%${search}%`)
                    .orWhere('achievements.description', 'like', `%${search}%`);
            });
        }
        
        // 分类过滤
        if (category) {
            query = query.where('achievements.category_id', category);
        }
        
        // 状态过滤
        if (status) {
            query = query.where('achievements.is_active', status === 'active');
        }
        
        // 获取总数（修正：单独count，不做join/group）
        const countQuery = db('achievements');
        if (search) {
            countQuery.where(function() {
                this.where('name', 'like', `%${search}%`)
                    .orWhere('description', 'like', `%${search}%`);
            });
        }
        if (category) {
            countQuery.where('category_id', category);
        }
        if (status) {
            countQuery.where('is_active', status === 'active');
        }
        const total = await countQuery.count('* as count').first();
        
        // 获取分页数据
        const achievements = await query
            .orderBy('achievements.sort_order', 'asc')
            .orderBy('achievements.name', 'asc')
            .limit(limit)
            .offset(offset);
        
        res.json({
            success: true,
            achievements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });
    } catch (error) {
        console.error('获取成就列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取成就列表失败'
        });
    }
});

// 创建成就
router.post('/achievements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            name,
            description,
            category_id,
            icon,
            badge_style,
            level,
            trigger_type,
            required_count,
            points,
            sort_order,
            is_active
        } = req.body;
        
        const achievementData = {
            name,
            description,
            category_id,
            icon,
            badge_style,
            level,
            trigger_type,
            required_count: parseInt(required_count) || 1,
            points: parseInt(points) || 0,
            sort_order: parseInt(sort_order) || 0,
            is_active: is_active === 'true' || is_active === true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const [newId] = await db('achievements').insert(achievementData);
        
        res.json({
            success: true,
            message: '成就创建成功',
            data: { id: newId }
        });
    } catch (error) {
        console.error('创建成就失败:', error);
        res.status(500).json({
            success: false,
            error: '创建成就失败'
        });
    }
});

// 更新成就
router.put('/achievements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category_id,
            icon,
            badge_style,
            level,
            trigger_type,
            required_count,
            points,
            sort_order,
            is_active
        } = req.body;
        
        // 检查成就是否存在
        const existingAchievement = await db('achievements').where('id', id).first();
        if (!existingAchievement) {
            return res.status(404).json({
                success: false,
                error: '成就不存在'
            });
        }
        
        const achievementData = {
            name,
            description,
            category_id,
            icon,
            badge_style,
            level,
            trigger_type,
            required_count: parseInt(required_count) || 1,
            points: parseInt(points) || 0,
            sort_order: parseInt(sort_order) || 0,
            is_active: is_active === 'true' || is_active === true,
            updated_at: new Date()
        };
        
        await db('achievements')
            .where('id', id)
            .update(achievementData);
        
        res.json({
            success: true,
            message: '成就更新成功'
        });
    } catch (error) {
        console.error('更新成就失败:', error);
        res.status(500).json({
            success: false,
            error: '更新成就失败'
        });
    }
});

// 获取自定义图标列表
router.get('/achievements/custom-icons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const customIconsDir = path.join(__dirname, '../assets/ico/achievements/custom');
    
    // 检查目录是否存在
    if (!fs.existsSync(customIconsDir)) {
      return res.json({ icons: [] });
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(customIconsDir);
    const icons = [];

    files.forEach(file => {
      const filePath = path.join(customIconsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        // 检查是否为图片文件
        const ext = path.extname(file).toLowerCase();
        if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
          icons.push({
            name: file,
            path: `/assets/ico/achievements/custom/${file}`,
            size: stats.size,
            type: ext.substring(1)
          });
        }
      }
    });

    res.json({ icons });
  } catch (error) {
    console.error('获取自定义图标失败:', error);
    res.status(500).json({ error: '获取自定义图标失败' });
  }
});

// 获取单个成就详情
router.get('/achievements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const achievement = await db('achievements')
            .leftJoin('achievement_categories', 'achievements.category_id', 'achievement_categories.id')
            .select(
                'achievements.*',
                'achievement_categories.name as category_name'
            )
            .where('achievements.id', id)
            .first();
        
        if (!achievement) {
            return res.status(404).json({
                success: false,
                error: '成就不存在'
            });
        }
        // 修正：返回格式为 { success: true, achievement: ... }
        res.json({
            success: true,
            achievement
        });
    } catch (error) {
        console.error('获取成就详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取成就详情失败'
        });
    }
});

// 删除成就
router.delete('/achievements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查是否有关联的用户成就
        const userAchievements = await db('user_achievements')
            .where('achievement_id', id)
            .count('* as count')
            .first();
        
        if (userAchievements.count > 0) {
            return res.status(400).json({
                success: false,
                error: '该成就已被用户获得，无法删除'
            });
        }
        
        await db('achievements').where('id', id).del();
        
        res.json({
            success: true,
            message: '成就删除成功'
        });
    } catch (error) {
        console.error('删除成就失败:', error);
        res.status(500).json({
            success: false,
            error: '删除成就失败'
        });
    }
});

// 创建或更新成就分类
router.post('/achievement-categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            id,
            name,
            description,
            icon,
            sort_order
        } = req.body;
        
        const categoryData = {
            name,
            description,
            icon,
            sort_order: parseInt(sort_order) || 0,
            updated_at: new Date()
        };
        
        if (id) {
            // 更新分类
            await db('achievement_categories')
                .where('id', id)
                .update(categoryData);
            
            res.json({
                success: true,
                message: '分类更新成功'
            });
        } else {
            // 创建新分类
            categoryData.created_at = new Date();
            const result = await db('achievement_categories').insert(categoryData).returning('id');
            const newId = result && result.length > 0 ? result[0].id : null;
            
            res.json({
                success: true,
                message: '分类创建成功',
                data: { id: newId }
            });
        }
    } catch (error) {
        console.error('保存分类失败:', error);
        res.status(500).json({
            success: false,
            error: '保存分类失败'
        });
    }
});

// 下载成就图标
router.post('/achievements/download-icons', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // 图标目录路径
        const iconsDir = path.join(__dirname, '..', 'assets', 'ico');
        const results = [];
        
        // 检查图标目录是否存在
        try {
            await fs.access(iconsDir);
            results.push('✅ 图标目录检查完成');
        } catch (error) {
            results.push('❌ 图标目录不存在，正在创建...');
            await fs.mkdir(iconsDir, { recursive: true });
            results.push('✅ 图标目录创建成功');
        }
        
        // 获取现有图标文件
        let existingIcons = [];
        try {
            const files = await fs.readdir(iconsDir);
            existingIcons = files.filter(file => 
                file.endsWith('.svg') || 
                file.endsWith('.png') || 
                file.endsWith('.jpg') || 
                file.endsWith('.jpeg')
            );
            results.push(`✅ 发现 ${existingIcons.length} 个现有图标文件`);
        } catch (error) {
            results.push('⚠️ 无法读取现有图标文件');
        }
        
        // 预定义的成就图标列表
        const predefinedIcons = [
            'achievement-icons.json',
            'analytics-report.svg',
            'certificate.svg',
            'community-active.svg',
            'efficiency-focus.svg',
            'efficiency-quality.svg',
            'efficiency-speed.svg',
            'first-study.svg',
            'focus-mode.svg',
            'frequency-daily.svg',
            'frequency-monthly.svg',
            'frequency-weekly.svg',
            'gold-badge.svg',
            'holiday-special.svg',
            'knowledge-star.svg',
            'premium-theme.svg',
            'project-bronze.svg',
            'project-complete.svg',
            'project-gold.svg',
            'project-silver.svg',
            'special-innovation.svg',
            'special-mastery.svg',
            'special-milestone.svg',
            'streak-30.svg',
            'streak-7.svg',
            'study-champion.svg',
            'study-expert.svg',
            'time-master.svg'
        ];
        
        results.push(`✅ 准备下载 ${predefinedIcons.length} 个预定义图标`);
        
        // 模拟下载过程（实际项目中可以从远程服务器下载）
        let downloadedCount = 0;
        let skippedCount = 0;
        
        for (const iconName of predefinedIcons) {
            const iconPath = path.join(iconsDir, iconName);
            
            try {
                // 检查文件是否已存在
                await fs.access(iconPath);
                skippedCount++;
                results.push(`⏭️ 跳过已存在的图标: ${iconName}`);
            } catch (error) {
                // 文件不存在，创建示例图标
                if (iconName.endsWith('.svg')) {
                    // 创建简单的SVG图标
                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4 2"/>
</svg>`;
                    await fs.writeFile(iconPath, svgContent);
                } else if (iconName.endsWith('.json')) {
                    // 创建图标配置JSON文件
                    const iconConfig = {
                        icons: predefinedIcons.filter(name => name !== 'achievement-icons.json'),
                        lastUpdated: new Date().toISOString(),
                        version: '1.0.0'
                    };
                    await fs.writeFile(iconPath, JSON.stringify(iconConfig, null, 2));
                } else {
                    // 创建占位符文件
                    await fs.writeFile(iconPath, `# ${iconName} - 图标占位符文件`);
                }
                
                downloadedCount++;
                results.push(`✅ 下载图标: ${iconName}`);
            }
        }
        
        results.push(`✅ 下载完成！新增 ${downloadedCount} 个图标，跳过 ${skippedCount} 个已存在图标`);
        results.push('✅ 图标库已更新，可在成就管理中使用');
        
        res.json({
            success: true,
            message: '图标下载完成',
            results: results,
            stats: {
                total: predefinedIcons.length,
                downloaded: downloadedCount,
                skipped: skippedCount,
                existing: existingIcons.length
            }
        });
    } catch (error) {
        console.error('图标下载失败:', error);
        res.status(500).json({
            success: false,
            error: '图标下载失败',
            results: [
                '❌ 图标下载过程中发生错误',
                `❌ 错误详情: ${error.message}`,
                '⚠️ 请检查文件权限或联系管理员'
            ]
        });
    }
});

// 获取成就管理统计数据
router.get('/achievement-stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [totalAchievements] = await db('achievements').count('* as count');
        const [totalCategories] = await db('achievement_categories').count('* as count');
        const [activeUsers] = await db('users').where('is_active', true).count('* as count');
        
        // 修正：积分统计使用user_points表
        let totalPoints = 0;
        try {
            const pointsResult = await db('user_points').sum('total_points as total').first();
            totalPoints = parseInt(pointsResult.total) || 0;
        } catch (error) {
            console.log('用户积分查询失败，使用默认值0:', error.message);
            totalPoints = 0;
        }
        
        res.json({
            success: true,
            data: {
                totalAchievements: totalAchievements.count,
                totalCategories: totalCategories.count,
                activeUsers: activeUsers.count,
                totalPoints: totalPoints
            }
        });
    } catch (error) {
        console.error('获取成就统计数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取成就统计数据失败'
        });
    }
});

// ==================== 用户数据查看API ====================

// 获取用户列表（用于筛选器）
router.get('/data/users-list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db('users')
            .select('id', 'username', 'email', 'role', 'is_active')
            .orderBy('username');
        
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户列表失败'
        });
    }
});

// 获取项目列表（用于筛选器）
router.get('/data/projects-list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.query;
        let query = db('study_projects').select('id', 'name', 'user_id');
        
        if (userId) {
            query = query.where('user_id', userId);
        }
        
        const projects = await query.orderBy('name');
        
        res.json({
            success: true,
            projects: projects
        });
    } catch (error) {
        console.error('获取项目列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取项目列表失败'
        });
    }
});

// 获取用户项目数据
router.get('/data/user-projects', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            userId, 
            status, 
            startDate, 
            endDate 
        } = req.query;
        
        let query = db('study_projects as sp')
            .join('users as u', 'sp.user_id', 'u.id')
            .select(
                'sp.id',
                'sp.name',
                'sp.status',
                'sp.start_date',
                'sp.completion_date',
                'sp.created_at',
                'u.username',
                'u.email'
            );
        
        // 应用筛选条件
        if (userId) {
            query = query.where('sp.user_id', userId);
        }
        
        if (status) {
            query = query.where('sp.status', status);
        }
        
        if (startDate) {
            query = query.where('sp.created_at', '>=', startDate);
        }
        
        if (endDate) {
            query = query.where('sp.created_at', '<=', endDate + ' 23:59:59');
        }
        
        // 获取总数
        const countQuery = query.clone();
        const [{ total }] = await countQuery.count('* as total');
        
        // 分页
        const offset = (page - 1) * limit;
        const projects = await query
            .orderBy('sp.created_at', 'desc')
            .limit(limit)
            .offset(offset);
        
        res.json({
            success: true,
            data: projects,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('获取用户项目数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户项目数据失败'
        });
    }
});

// 获取用户学习记录数据
router.get('/data/user-sessions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            userId, 
            projectId, 
            startDate, 
            endDate 
        } = req.query;
        
        let query = db('study_sessions as ss')
            .join('users as u', 'ss.user_id', 'u.id')
            .leftJoin('study_projects as sp', 'ss.project_id', 'sp.id')
            .select(
                'ss.id',
                'ss.study_date',
                'ss.start_time_new',
                'ss.end_time_new',
                'ss.duration',
                'ss.project_name',
                'u.username',
                'u.email'
            );
        
        // 应用筛选条件
        if (userId) {
            query = query.where('ss.user_id', userId);
        }
        
        if (projectId) {
            query = query.where('ss.project_id', projectId);
        }
        
        if (startDate) {
            query = query.where('ss.study_date', '>=', startDate);
        }
        
        if (endDate) {
            query = query.where('ss.study_date', '<=', endDate);
        }
        
        // 获取总数
        const countQuery = query.clone();
        const [{ total }] = await countQuery.count('* as total');
        
        // 分页
        const offset = (page - 1) * limit;
        const sessions = await query
            .orderBy('ss.study_date', 'desc')
            .orderBy('ss.start_time_new', 'desc')
            .limit(limit)
            .offset(offset);
        
        res.json({
            success: true,
            data: sessions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('获取用户学习记录失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户学习记录失败'
        });
    }
});

// 获取用户操作日志数据
router.get('/data/user-logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            userId, 
            operationType, 
            startDate, 
            endDate 
        } = req.query;
        
        let query = db('data_operation_logs as dol')
            .join('users as u', 'dol.user_id', 'u.id')
            .select(
                'dol.id',
                'dol.operation_type',
                'dol.operation_name',
                'dol.description',
                'dol.status',
                'dol.created_at',
                'u.username',
                'u.email'
            );
        
        // 应用筛选条件
        if (userId) {
            query = query.where('dol.user_id', userId);
        }
        
        if (operationType) {
            query = query.where('dol.operation_type', operationType);
        }
        
        if (startDate) {
            query = query.where('dol.created_at', '>=', startDate);
        }
        
        if (endDate) {
            query = query.where('dol.created_at', '<=', endDate + ' 23:59:59');
        }
        
        // 获取总数
        const countQuery = query.clone();
        const [{ total }] = await countQuery.count('* as total');
        
        // 分页
        const offset = (page - 1) * limit;
        const logs = await query
            .orderBy('dol.created_at', 'desc')
            .limit(limit)
            .offset(offset);
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('获取用户操作日志失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户操作日志失败'
        });
    }
});

module.exports = router; 