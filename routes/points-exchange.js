const express = require('express');
const router = express.Router();
const pointsExchangeService = require('../services/points-exchange');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');

// 图片上传配置
const upload = multer({
  dest: path.join(__dirname, '../uploads/products'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// ====== DEMO 数据统一源 ======
const demoData = {
  users: [
    { id: 161, username: 'admin', email: 'admin@example.com', avatar: '/assets/ico/default.svg' },
    { id: 162, username: 'testuser', email: 'testuser@example.com', avatar: '/assets/ico/default.svg' },
    { id: 163, username: 'test7', email: 'test7@example.com', avatar: '/assets/ico/default.svg' }
  ],
  products: [
    { id: 1, name: '专注模式', description: '解锁专注模式，屏蔽干扰，提升学习效率', category_id: 1, image_url: '/assets/ico/focus-mode.svg', points_required: 100, stock_quantity: -1, exchange_limit_per_user: 1, requires_approval: false, sort_order: 1, is_active: true },
    { id: 2, name: '学习报告', description: '获得详细的学习分析报告', category_id: 1, image_url: '/assets/ico/analytics-report.svg', points_required: 50, stock_quantity: -1, exchange_limit_per_user: 5, requires_approval: false, sort_order: 2, is_active: true },
    { id: 3, name: '黄金徽章', description: '获得特殊的黄金成就徽章', category_id: 2, image_url: '/assets/ico/gold-badge.svg', points_required: 200, stock_quantity: 100, exchange_limit_per_user: 1, requires_approval: true, sort_order: 3, is_active: true },
    { id: 4, name: '高级主题', description: '解锁高级界面主题', category_id: 3, image_url: '/assets/ico/premium-theme.svg', points_required: 150, stock_quantity: -1, exchange_limit_per_user: 1, requires_approval: false, sort_order: 4, is_active: true },
    { id: 5, name: 'JavaScript进阶课程', description: '包含完整的学习路径和实战项目', category_id: 5, image_url: '/assets/ico/certificate.svg', points_required: 5000, stock_quantity: 10, exchange_limit_per_user: 1, requires_approval: true, sort_order: 5, is_active: true },
    { id: 6, name: '技术书籍合集', description: '精选的技术书籍，涵盖多个领域', category_id: 6, image_url: '/assets/ico/knowledge-star.svg', points_required: 2000, stock_quantity: 25, exchange_limit_per_user: 3, requires_approval: true, sort_order: 6, is_active: true },
    { id: 7, name: '在线工具会员', description: '提供各种开发工具的会员服务', category_id: 7, image_url: '/assets/ico/efficiency-focus.svg', points_required: 3000, stock_quantity: 50, exchange_limit_per_user: 2, requires_approval: true, sort_order: 7, is_active: true },
    { id: 8, name: '学习周边套装', description: '高质量的学习用品和周边产品', category_id: 8, image_url: '/assets/ico/community-active.svg', points_required: 800, stock_quantity: 100, exchange_limit_per_user: 5, requires_approval: false, sort_order: 8, is_active: true },
    { id: 9, name: '一对一技术辅导', description: '专业导师一对一技术指导', category_id: 9, image_url: '/assets/ico/study-expert.svg', points_required: 8000, stock_quantity: 5, exchange_limit_per_user: 1, requires_approval: true, sort_order: 9, is_active: true },
    { id: 10, name: '学习纪念徽章', description: '纪念你的学习历程', category_id: 4, image_url: '/assets/ico/special-milestone.svg', points_required: 300, stock_quantity: 200, exchange_limit_per_user: 1, requires_approval: false, sort_order: 10, is_active: true }
  ],
  categories: [
    { id: 1, name: '学习工具', description: '提升学习效率的虚拟工具', icon: '🛠️', is_active: true, sort_order: 1 },
    { id: 2, name: '成就徽章', description: '特殊的成就徽章和装饰', icon: '🏆', is_active: true, sort_order: 2 },
    { id: 3, name: '特权功能', description: '解锁特殊功能和使用权限', icon: '⭐', is_active: true, sort_order: 3 },
    { id: 4, name: '纪念品', description: '学习历程纪念品', icon: '🎁', is_active: true, sort_order: 4 },
    { id: 5, name: '课程', description: '在线学习课程', icon: '📚', is_active: true, sort_order: 5 },
    { id: 6, name: '书籍', description: '技术书籍和资料', icon: '📖', is_active: true, sort_order: 6 },
    { id: 7, name: '工具', description: '开发工具和服务', icon: '🔧', is_active: true, sort_order: 7 },
    { id: 8, name: '周边', description: '学习用品和周边', icon: '🎒', is_active: true, sort_order: 8 },
    { id: 9, name: '服务', description: '专业服务', icon: '👨‍🏫', is_active: true, sort_order: 9 }
  ],
  exchangeRecords: [
    { id: 1, user_id: 161, product_id: 6, status: 'approved', points_spent: 2000, quantity: 1, created_at: '2025-07-01 10:30:00', updated_at: '2025-07-01 11:00:00', completed_at: '2025-07-01 11:00:00', approved_by: 1, approved_at: '2025-07-01 11:00:00', approval_notes: '审核通过' },
    { id: 2, user_id: 162, product_id: 8, status: 'pending', points_spent: 800, quantity: 1, created_at: '2025-07-05 14:20:00', updated_at: '2025-07-05 14:20:00', completed_at: null, approved_by: null, approved_at: null, approval_notes: '' },
    { id: 3, user_id: 163, product_id: 7, status: 'approved', points_spent: 3000, quantity: 1, created_at: '2025-07-02 09:15:00', updated_at: '2025-07-02 10:00:00', completed_at: '2025-07-02 10:00:00', approved_by: 1, approved_at: '2025-07-02 10:00:00', approval_notes: '审核通过' },
    { id: 4, user_id: 162, product_id: 5, status: 'processing', points_spent: 5000, quantity: 1, created_at: '2025-07-08 16:45:00', updated_at: '2025-07-08 16:45:00', completed_at: null, approved_by: null, approved_at: null, approval_notes: '' },
    { id: 5, user_id: 161, product_id: 9, status: 'rejected', points_spent: 8000, quantity: 1, created_at: '2025-07-06 13:30:00', updated_at: '2025-07-06 14:00:00', completed_at: null, approved_by: 1, approved_at: '2025-07-06 14:00:00', approval_notes: '库存不足，暂时无法提供此服务' },
    { id: 6, user_id: 163, product_id: 3, status: 'pending', points_spent: 200, quantity: 1, created_at: '2025-07-09 15:45:00', updated_at: '2025-07-09 15:45:00', completed_at: null, approved_by: null, approved_at: null, approval_notes: '' },
    { id: 7, user_id: 162, product_id: 6, status: 'completed', points_spent: 2000, quantity: 1, created_at: '2025-07-03 11:20:00', updated_at: '2025-07-03 12:00:00', completed_at: '2025-07-03 12:00:00', approved_by: 1, approved_at: '2025-07-03 11:30:00', approval_notes: '审核通过' },
    { id: 8, user_id: 161, product_id: 4, status: 'completed', points_spent: 150, quantity: 1, created_at: '2025-07-04 14:30:00', updated_at: '2025-07-04 14:35:00', completed_at: '2025-07-04 14:35:00', approved_by: null, approved_at: null, approval_notes: '' }
  ]
};

// 用户端API
// 获取商品分类
router.get('/categories', authenticateToken, async (req, res) => {
  const categories = await pointsExchangeService.getProductCategories();
  res.json({ success: true, data: categories });
});

// 获取商品列表
router.get('/products', authenticateToken, async (req, res) => {
  if (isDemoApi(req)) {
    return res.json({ success: true, data: demoData.products });
  }
  const { category_id, max_points, search } = req.query;
  const products = await pointsExchangeService.getVirtualProducts({ category_id, max_points, search });
  res.json({ success: true, data: products });
});

// 获取商品详情
router.get('/products/:id', authenticateToken, async (req, res) => {
  const product = await pointsExchangeService.getProductById(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: '商品不存在' });
  res.json({ success: true, data: product });
});

// 兑换商品
router.post('/products/:id/exchange', authenticateToken, async (req, res) => {
  const { quantity = 1 } = req.body;
  const quantityNum = parseInt(quantity) || 1;
  
  // 验证数量
  if (quantityNum < 1 || quantityNum > 10) {
    return res.status(400).json({ 
      success: false, 
      error: '兑换数量必须在1-10之间' 
    });
  }
  
  const result = await pointsExchangeService.exchangeProduct(req.user.id, req.params.id, quantityNum);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result });
});

// 获取用户兑换记录
router.get('/exchange-records', authenticateToken, async (req, res) => {
  if (isDemoApi(req)) {
    // 可根据 req.user.id 过滤
    const userId = req.user && req.user.id;
    let records = demoData.exchangeRecords;
    if (userId) records = records.filter(r => r.user_id === userId);
    res.json({
      success: true,
      data: {
        records,
        pagination: { page: 1, limit: 10, total: records.length, totalPages: 1 }
      }
    });
    return;
  }
  // 传递search参数
  const { search, status, page, limit } = req.query;
  const result = await pointsExchangeService.getUserExchangeRecords(req.user.id, { search, status, page, limit });
  res.json(result);
});

// 获取用户积分明细
router.get('/points-records', authenticateToken, async (req, res) => {
  if (isDemoApi(req)) {
    // 生成积分明细：注册奖励、打卡、完成项目、兑换商品
    const userId = req.user && req.user.id;
    let records = [];
    if (!userId || userId === 161) {
      records = [
        { id: 1, type: 'gain', points: 10000, description: '新用户注册奖励', created_at: '2025-07-01 08:00:00' },
        { id: 2, type: 'gain', points: 10, description: '每日打卡', created_at: '2025-07-01 08:10:00' },
        ...demoData.exchangeRecords.filter(r => r.user_id === 161).map((r, i) => ({ id: 100 + i, type: 'spend', points: -r.points_spent, description: `兑换 ${demoData.products.find(p => p.id === r.product_id)?.name || ''}`, created_at: r.created_at }))
      ];
    } else if (userId === 162) {
      records = [
        { id: 3, type: 'gain', points: 10000, description: '新用户注册奖励', created_at: '2025-07-01 08:00:00' },
        { id: 4, type: 'gain', points: 10, description: '每日打卡', created_at: '2025-07-01 08:10:00' },
        ...demoData.exchangeRecords.filter(r => r.user_id === 162).map((r, i) => ({ id: 200 + i, type: 'spend', points: -r.points_spent, description: `兑换 ${demoData.products.find(p => p.id === r.product_id)?.name || ''}`, created_at: r.created_at }))
      ];
    } else if (userId === 163) {
      records = [
        { id: 5, type: 'gain', points: 10000, description: '新用户注册奖励', created_at: '2025-07-01 08:00:00' },
        { id: 6, type: 'gain', points: 10, description: '每日打卡', created_at: '2025-07-01 08:10:00' },
        ...demoData.exchangeRecords.filter(r => r.user_id === 163).map((r, i) => ({ id: 300 + i, type: 'spend', points: -r.points_spent, description: `兑换 ${demoData.products.find(p => p.id === r.product_id)?.name || ''}`, created_at: r.created_at }))
      ];
    }
    res.json({
      success: true,
      data: {
        records,
        pagination: { page: 1, limit: 10, total: records.length, totalPages: 1 }
      }
    });
    return;
  }
  const { page, limit, record_type, search } = req.query;
  const result = await pointsExchangeService.getPointsRecords(req.user.id, { page, limit, record_type, search });
  res.json(result);
});

// 获取用户积分信息
router.get('/user-points', authenticateToken, async (req, res) => {
  console.log('用户积分API调用 - 用户ID:', req.user.id, '用户名:', req.user.username);
  const points = await pointsExchangeService.getUserPoints(req.user.id);
  console.log('获取到的积分数据:', points);
  res.json({ success: true, data: points });
});

// 工具函数：判断是否为演示模式API
function isDemoApi(req) {
  return req.originalUrl && req.originalUrl.startsWith('/demo/api');
}

// 管理端API
// 获取所有商品（含禁用）
router.get('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    // 演示模式下返回硬编码商品
    return res.json({
      success: true,
      data: demoData.products
    });
  }
  const { category_id, max_points, search } = req.query;
  const products = await pointsExchangeService.getAdminVirtualProducts({ category_id, max_points, search });
  res.json({ success: true, data: products });
});

// 校验商品名称唯一性
router.get('/admin/products/check-name', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.query;
  if (!name) return res.json({ exists: false });
  const exists = await db('virtual_products').where({ name }).first();
  res.json({ exists: !!exists });
});

// 新建商品
router.post('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  const { name, ...otherFields } = req.body;
  const exists = await db('virtual_products').where({ name }).first();
  if (exists) {
    return res.status(400).json({ success: false, message: '商品名称已存在，请更换名称' });
  }
  try {
    const {
      name, description, category_id, image_url, points_required,
      stock_quantity, exchange_limit_per_user, requires_approval, sort_order, is_active
    } = req.body;
    
    if (!name || !category_id || !points_required) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }
    
    const [result] = await db('virtual_products').insert({
      name,
      description,
      category_id,
      image_url,
      points_required: parseInt(points_required),
      stock_quantity: stock_quantity === -1 ? -1 : parseInt(stock_quantity),
      exchange_limit_per_user: parseInt(exchange_limit_per_user) || 1,
      requires_approval:
        requires_approval === true ||
        requires_approval === 'on' ||
        requires_approval === 'true' ||
        requires_approval === 1 ||
        requires_approval === '1',
      sort_order: parseInt(sort_order) || 0,
      is_active: Boolean(is_active),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    const productId = result.id;
    
    res.json({
      success: true,
      data: { id: productId },
      message: '商品创建成功'
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({ success: false, error: '创建商品失败' });
  }
});

// 更新商品
router.put('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, category_id, image_url, points_required,
      stock_quantity, exchange_limit_per_user, requires_approval, sort_order, is_active
    } = req.body;
    
    if (!name || !category_id || !points_required) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }
    
    await db('virtual_products')
      .where('id', id)
      .update({
        name,
        description,
        category_id,
        image_url,
        points_required: parseInt(points_required),
        stock_quantity: stock_quantity === -1 ? -1 : parseInt(stock_quantity),
        exchange_limit_per_user: parseInt(exchange_limit_per_user) || 1,
        requires_approval:
          requires_approval === true ||
          requires_approval === 'on' ||
          requires_approval === 'true' ||
          requires_approval === 1 ||
          requires_approval === '1',
        sort_order: parseInt(sort_order) || 0,
        is_active: Boolean(is_active),
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      message: '商品更新成功'
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({ success: false, error: '更新商品失败' });
  }
});

// 删除商品
router.delete('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有兑换记录
    const exchangeCount = await db('exchange_records')
      .where('product_id', id)
      .count('* as count')
      .first();
    
    if (exchangeCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: '该商品已有兑换记录，无法删除' 
      });
    }
    
    await db('virtual_products').where('id', id).del();
    
    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({ success: false, error: '删除商品失败' });
  }
});

// 商品图片上传
router.post('/admin/products/upload-image', authenticateToken, requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('图片上传错误:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: '图片文件过大，请选择小于5MB的图片文件' 
        });
      }
      if (err.message === '只允许上传图片文件') {
        return res.status(400).json({ 
          success: false, 
          error: '只允许上传图片文件（JPG、PNG、GIF等）' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        error: '图片上传失败，请重试' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }
    
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.json({ success: true, data: { image_url: imageUrl } });
  });
});

// 分类管理API
// 获取所有分类
router.get('/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    return res.json({
      success: true,
      data: demoData.categories
    });
  }
  try {
    const categories = await db('product_categories')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ success: false, error: '获取分类失败' });
  }
});

// 新建分类
router.post('/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, icon, is_active, sort_order } = req.body;
    // 检查是否已存在同名分类
    const exists = await db('product_categories').where({ name }).first();
    if (exists) {
      return res.status(400).json({ success: false, error: '分类名称已存在' });
    }
    
    const [category] = await db('product_categories').insert({
      name,
      description,
      icon,
      is_active: Boolean(is_active),
      sort_order: parseInt(sort_order) || 0,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    res.json({
      success: true,
      data: { id: category.id },
      message: '分类创建成功'
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ success: false, error: '创建分类失败' });
  }
});

// 更新分类
router.put('/admin/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, is_active, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: '分类名称不能为空' });
    }
    
    await db('product_categories')
      .where('id', id)
      .update({
        name,
        description,
        icon,
        is_active: Boolean(is_active),
        sort_order: parseInt(sort_order) || 0,
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      message: '分类更新成功'
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ success: false, error: '更新分类失败' });
  }
});

// 删除分类
router.delete('/admin/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有商品使用此分类
    const productCount = await db('virtual_products')
      .where('category_id', id)
      .count('* as count')
      .first();
    
    if (productCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: '该分类下还有商品，无法删除' 
      });
    }
    
    await db('product_categories').where('id', id).del();
    
    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ success: false, error: '删除分类失败' });
  }
});

// 获取所有积分规则
router.get('/admin/points-rules', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    return res.json({
      success: true,
      data: [
        { id: 1, name: '每日打卡', description: '每日学习打卡奖励', points: 10, is_active: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '完成项目', description: '完成学习项目奖励', points: 50, is_active: true, created_at: new Date(), updated_at: new Date() }
      ]
    });
  }
  const rules = await pointsExchangeService.getPointsRules();
  res.json({ success: true, data: rules });
});

// 新建积分规则
router.post('/admin/points-rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pointsExchangeService.createPointsRule(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('创建积分规则失败:', error);
    res.status(500).json({ success: false, error: '创建积分规则失败' });
  }
});

// 更新积分规则
router.put('/admin/points-rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pointsExchangeService.updatePointsRule(req.params.id, req.body);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true });
});

// 删除积分规则
router.delete('/admin/points-rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pointsExchangeService.deletePointsRule(req.params.id);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true });
});

// 获取待审核兑换申请
router.get('/admin/pending-exchanges', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    return res.json({
      success: true,
      data: demoData.exchangeRecords.filter(r => r.status === 'pending')
    });
  }
  const records = await pointsExchangeService.getPendingExchanges();
  res.json({ success: true, data: records });
});

// 获取待审核兑换申请（兼容前端调用）
router.get('/admin/exchange/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('开始获取待审核兑换记录...');
    
    const records = await db('exchange_records as er')
      .select(
        'er.id',
        'er.user_id',
        'er.product_id',
        'er.status',
        'er.points_spent',
        'er.quantity',
        'er.created_at',
        'er.updated_at',
        'er.completed_at',
        'er.approved_by',
        'er.approved_at',
        'er.approval_notes',
        'u.username',
        'u.email',
        'u.avatar as user_avatar',
        'vp.name as product_name',
        'vp.description as product_description',
        'vp.image_url as product_image',
        'vp.requires_approval',
        'pc.name as category_name',
        'admin.username as approved_by_username'
      )
      .leftJoin('users as u', 'er.user_id', 'u.id')
      .leftJoin('virtual_products as vp', 'er.product_id', 'vp.id')
      .leftJoin('product_categories as pc', 'vp.category_id', 'pc.id')
      .leftJoin('users as admin', 'er.approved_by', 'admin.id')
      .where('er.status', 'pending')
      .orderBy('er.created_at', 'desc');

    // 格式化数据以匹配前端期望的结构
    const formattedRecords = records.map(record => ({
      id: record.id,
      user_id: record.user_id,
      product_id: record.product_id,
      status: record.status,
      points_required: record.points_spent,
      quantity: record.quantity, // 这里严格等于数据库字段
      created_at: record.created_at,
      updated_at: record.updated_at,
      completed_at: record.completed_at,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      approval_notes: record.approval_notes,
      user: {
        id: record.user_id,
        username: record.username,
        email: record.email,
        avatar: record.user_avatar
      },
      product: {
        id: record.product_id,
        name: record.product_name,
        description: record.product_description,
        image_url: record.product_image,
        requires_approval: record.requires_approval
      },
      category: {
        name: record.category_name
      },
      approved_by_user: record.approved_by_username
    }));

    console.log(`成功获取 ${formattedRecords.length} 条待审核记录`);
    
    res.json({
      success: true,
      records: formattedRecords
    });
  } catch (error) {
    console.error('获取待审核兑换记录失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取待审核兑换记录失败' 
    });
  }
});

// 审核兑换申请
router.post('/admin/exchanges/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  console.log('审核兑换申请开始:', req.params.id, req.body);
  const { approved, notes } = req.body;
  const result = await pointsExchangeService.approveExchange(req.params.id, req.user.id, approved, notes);
  if (!result.success) {
    console.log('审核失败:', result.error);
    return res.status(400).json({ success: false, error: result.error });
  }
  console.log('审核成功');
  res.json({ success: true });
});

// 删除兑换记录
router.delete('/admin/exchanges/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查兑换记录是否存在
    const exchange = await db('exchange_records').where('id', id).first();
    if (!exchange) {
      return res.status(404).json({ 
        success: false, 
        error: '兑换记录不存在' 
      });
    }
    
    // 如果兑换记录已通过或已完成，不允许删除
    if (exchange.status === 'approved' || exchange.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: '已通过或已完成的兑换记录不能删除' 
      });
    }
    
    // 删除兑换记录
    await db('exchange_records').where('id', id).del();
    
    res.json({
      success: true,
      message: '兑换记录删除成功'
    });
  } catch (error) {
    console.error('删除兑换记录失败:', error);
    res.status(500).json({ success: false, error: '删除兑换记录失败' });
  }
});

// 获取兑换统计
router.get('/admin/exchange-stats', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    const demoRecords = demoData.exchangeRecords;
    const totalProducts = demoData.products.length;
    const totalExchanges = demoRecords.length;
    const pending = demoRecords.filter(r => r.status === 'pending').length;
    const approved = demoRecords.filter(r => r.status === 'approved').length;
    const rejected = demoRecords.filter(r => r.status === 'rejected').length;
    const completed = demoRecords.filter(r => r.status === 'completed').length;
    const totalPoints = demoRecords.reduce((sum, r) => sum + r.points_spent, 0);
    res.json({
      success: true,
      data: {
        total: totalExchanges,
        pending,
        approved,
        rejected,
        totalPoints
      }
    });
    return;
  }
  try {
    console.log('开始获取兑换统计信息...');
    const totalExchanges = await db('exchange_records').count('* as count').first();
    const pending = await db('exchange_records').where('status', 'pending').count('* as count').first();
    const approved = await db('exchange_records').where('status', 'approved').count('* as count').first();
    const rejected = await db('exchange_records').where('status', 'rejected').count('* as count').first();
    const totalPoints = await db('user_points').sum('total_points as total').first();
    
    const stats = {
      total: totalExchanges.count || 0,
      pending: pending.count || 0,
      approved: approved.count || 0,
      rejected: rejected.count || 0,
      totalPoints: totalPoints.total || 0
    };
    
    console.log('统计信息查询结果:', stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取兑换统计失败:', error);
    res.status(500).json({ success: false, error: '获取兑换统计失败' });
  }
});

// 获取所有兑换记录（管理端）
router.get('/admin/exchange-records', authenticateToken, requireAdmin, async (req, res) => {
  if (isDemoApi(req)) {
    return res.json({
      success: true,
      data: demoData.exchangeRecords
    });
  }
  try {
    const { page = 1, limit = 10, status, user_id, search } = req.query;
    const offset = (page - 1) * limit;

    // 1. 查询数据列表
    let query = db('exchange_records as er')
      .select(
        'er.id',
        'er.user_id',
        'er.product_id',
        'er.status',
        'er.points_spent',
        'er.quantity',
        'er.created_at',
        'er.updated_at',
        'er.completed_at',
        'er.approved_by',
        'er.approved_at',
        'er.approval_notes',
        'u.username',
        'u.email',
        'u.avatar as user_avatar',
        'vp.name as product_name',
        'vp.description as product_description',
        'vp.image_url as product_image',
        'vp.requires_approval',
        'pc.name as category_name',
        'admin.username as approved_by_username'
      )
      .leftJoin('users as u', 'er.user_id', 'u.id')
      .leftJoin('virtual_products as vp', 'er.product_id', 'vp.id')
      .leftJoin('product_categories as pc', 'vp.category_id', 'pc.id')
      .leftJoin('users as admin', 'er.approved_by', 'admin.id')
      .orderBy('er.created_at', 'desc');

    if (status) query = query.where('er.status', status);
    if (user_id) query = query.where('er.user_id', user_id);
    
    // 添加搜索功能
    if (search) {
      query = query.where(function() {
        this.where('u.username', 'ILIKE', `%${search}%`)
          .orWhere('vp.name', 'ILIKE', `%${search}%`)
          .orWhere('vp.description', 'ILIKE', `%${search}%`);
      });
    }

    const records = await query.limit(limit).offset(offset);

    // 2. 查询总数（只查主表）
    let countQuery = db('exchange_records as er')
      .leftJoin('users as u', 'er.user_id', 'u.id')
      .leftJoin('virtual_products as vp', 'er.product_id', 'vp.id');
    if (status) countQuery = countQuery.where('er.status', status);
    if (user_id) countQuery = countQuery.where('er.user_id', user_id);
    
    // 添加搜索功能到计数查询
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('u.username', 'ILIKE', `%${search}%`)
          .orWhere('vp.name', 'ILIKE', `%${search}%`)
          .orWhere('vp.description', 'ILIKE', `%${search}%`);
      });
    }
    
    const total = await countQuery.count('* as count').first();

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取兑换记录失败:', error);
    res.status(500).json({ success: false, error: '获取兑换记录失败' });
  }
});

module.exports = router; 