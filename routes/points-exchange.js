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

// 用户端API
// 获取商品分类
router.get('/categories', authenticateToken, async (req, res) => {
  const categories = await pointsExchangeService.getProductCategories();
  res.json({ success: true, data: categories });
});

// 获取商品列表
router.get('/products', authenticateToken, async (req, res) => {
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
  // 传递search参数
  const { search, status, page, limit } = req.query;
  const result = await pointsExchangeService.getUserExchangeRecords(req.user.id, { search, status, page, limit });
  res.json(result);
});

// 获取用户积分明细
router.get('/points-records', authenticateToken, async (req, res) => {
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

// 管理端API
// 获取所有商品（含禁用）
router.get('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
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
  const records = await pointsExchangeService.getPendingExchanges();
  res.json({ success: true, data: records });
});

// 审核兑换申请
router.post('/admin/exchanges/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  const { approved, notes } = req.body;
  const result = await pointsExchangeService.approveExchange(req.params.id, req.user.id, approved, notes);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
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
  try {
    const totalExchanges = await db('exchange_records').count('* as count').first();
    const pendingExchanges = await db('exchange_records').where('status', 'pending').count('* as count').first();
    const totalPoints = await db('user_points').sum('total_points as total').first();
    
    res.json({
      success: true,
      data: {
        totalExchanges: totalExchanges.count || 0,
        pendingExchanges: pendingExchanges.count || 0,
        totalPoints: totalPoints.total || 0
      }
    });
  } catch (error) {
    console.error('获取兑换统计失败:', error);
    res.status(500).json({ success: false, error: '获取兑换统计失败' });
  }
});

// 获取所有兑换记录（管理端）
router.get('/admin/exchange-records', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id, search } = req.query;
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