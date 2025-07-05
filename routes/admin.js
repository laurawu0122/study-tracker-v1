const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 管理员仪表板
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.getAdminStats();
        res.render('admin/dashboard', {
            title: '管理员仪表板',
            stats,
            currentPage: 'admin-dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载管理员仪表板时出错'
        });
    }
});

// 用户管理
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.render('admin/users', {
            title: '用户管理',
            users,
            currentPage: 'admin-users'
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载用户列表时出错'
        });
    }
});

// 系统配置
router.get('/config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const config = await db.getSystemConfig();
        res.render('admin/config', {
            title: '系统配置',
            config,
            currentPage: 'admin-config'
        });
    } catch (error) {
        console.error('Admin config error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载系统配置时出错'
        });
    }
});

// 数据管理
router.get('/data', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dataStats = await db.getDataStats();
        res.render('admin/data', {
            title: '数据管理',
            dataStats,
            currentPage: 'admin-data'
        });
    } catch (error) {
        console.error('Admin data error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载数据统计时出错'
        });
    }
});

// 成就管理
router.get('/achievements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const achievements = await db.getAllAchievements();
        res.render('admin/achievements', {
            title: '成就管理',
            achievements,
            currentPage: 'admin-achievements'
        });
    } catch (error) {
        console.error('Admin achievements error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载成就列表时出错'
        });
    }
});

// 积分兑换管理
router.get('/points-exchange', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const exchangeRecords = await db.getExchangeRecords();
        res.render('admin/points-exchange', {
            title: '积分兑换管理',
            exchangeRecords,
            currentPage: 'admin-points-exchange'
        });
    } catch (error) {
        console.error('Admin points exchange error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载积分兑换记录时出错'
        });
    }
});

// 兑换审批
router.get('/exchange-approval', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pendingRecords = await db.getPendingExchangeRecords();
        res.render('admin/exchange-approval', {
            title: '兑换审批',
            pendingRecords,
            currentPage: 'admin-exchange-approval'
        });
    } catch (error) {
        console.error('Admin exchange approval error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载待审批记录时出错'
        });
    }
});

// SMTP 配置
router.get('/smtp-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const smtpConfig = await db.getSMTPConfig();
        res.render('admin/smtp-config', {
            title: 'SMTP 配置',
            smtpConfig,
            currentPage: 'admin-smtp-config'
        });
    } catch (error) {
        console.error('Admin SMTP config error:', error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: '加载 SMTP 配置时出错'
        });
    }
});

// 统计信息
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.getAdminStats();
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
                const users = await db.getAllUsers();
                return res.render('admin/users', { title: '用户管理', users, currentPage: 'admin-users' });
            }
            case 'data': {
                const dataStats = await db.getDataStats();
                return res.render('admin/data', { title: '数据管理', dataStats, currentPage: 'admin-data' });
            }
            case 'achievements': {
                const achievements = await db.getAllAchievements();
                return res.render('admin/achievements', { title: '成就管理', achievements, currentPage: 'admin-achievements' });
            }
            case 'config': {
                const config = await db.getSystemConfig();
                return res.render('admin/config', { title: '系统配置', config, currentPage: 'admin-config' });
            }
            case 'points-exchange': {
                const exchangeRecords = await db.getExchangeRecords();
                return res.render('admin/points-exchange', { title: '积分兑换管理', exchangeRecords, currentPage: 'admin-points-exchange' });
            }
            case 'exchange-approval': {
                const pendingRecords = await db.getPendingExchangeRecords();
                return res.render('admin/exchange-approval', { title: '兑换审批', pendingRecords, currentPage: 'admin-exchange-approval' });
            }
            case 'smtp-config': {
                const smtpConfig = await db.getSMTPConfig();
                return res.render('admin/smtp-config', { title: 'SMTP 配置', smtpConfig, currentPage: 'admin-smtp-config' });
            }
            case 'stats': {
                const stats = await db.getAdminStats();
                return res.render('admin/stats', { title: '统计信息', stats, currentPage: 'admin-stats' });
            }
            default:
                return res.status(404).send('Not Found');
        }
    } catch (error) {
        console.error(`Admin page ${tab} error:`, error);
        res.status(500).render('pages/error', {
            title: '错误',
            error: `加载${tab}页面时出错`
        });
    }
});

module.exports = router; 