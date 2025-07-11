const express = require('express');
const router = express.Router();
const achievementService = require('../services/achievements');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../database/db');

// 获取用户成就列表
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, search, status } = req.query;
    
    // 如果有分页或搜索参数，使用新的方法
    if (page || limit || search || status) {
      const result = await achievementService.getUserAchievementsWithPagination(userId, { page, limit, search, status });
      res.json(result);
    } else {
      // 否则使用原来的方法（保持向后兼容）
      const achievements = await achievementService.getUserAchievements(userId);
      res.json({
        success: true,
        data: achievements
      });
    }
  } catch (error) {
    console.error('获取用户成就失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成就失败'
    });
  }
});

// 获取用户成就统计
router.get('/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await achievementService.getUserAchievementStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取成就统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计失败'
    });
  }
});

// 获取成就分类
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await achievementService.getAchievementCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取成就分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
});

// 获取分类下的成就
router.get('/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const achievements = await achievementService.getAchievementsByCategory(categoryId);
    
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('获取分类成就失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成就失败'
    });
  }
});

// 手动触发成就检查（用于测试）
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { triggerType, data } = req.body;
    
    if (!triggerType) {
      return res.status(400).json({
        success: false,
        message: '缺少触发类型'
      });
    }
    
    await achievementService.checkAndUpdateAchievements(userId, triggerType, data);
    
    res.json({
      success: true,
      message: '成就检查完成'
    });
  } catch (error) {
    console.error('成就检查失败:', error);
    res.status(500).json({
      success: false,
      message: '成就检查失败'
    });
  }
});



// 获取所有成就定义（管理员用）
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    const achievements = await achievementService.getAllAchievements();
    
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('获取所有成就失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成就失败'
    });
  }
});

module.exports = router; 