const { db } = require('../database/db');
const moment = require('moment');

// 创建通知的辅助函数
async function createNotification(userId, type, title, message, data = {}) {
  try {
    const [result] = await db('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: JSON.stringify(data),
      read: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    // 记录新通知创建，用于前端轮询检测
    console.log(`积分兑换系统 - 新通知已创建: 用户ID=${userId}, 类型=${type}, 标题=${title}`);

    return result.id;
  } catch (error) {
    console.error('创建通知错误:', error);
    throw error;
  }
}

class PointsExchangeService {
  /**
   * 初始化用户积分记录
   */
  async initializeUserPoints(userId) {
    try {
      const existing = await db('user_points').where('user_id', userId).first();
      if (!existing) {
        await db('user_points').insert({
          user_id: userId,
          total_points: 0,
          available_points: 0,
          used_points: 0
        });
      }
      return true;
    } catch (error) {
      console.error('初始化用户积分失败:', error);
      return false;
    }
  }

  /**
   * 获取用户积分信息
   */
  async getUserPoints(userId) {
    try {
      await this.initializeUserPoints(userId);
      return await db('user_points').where('user_id', userId).first();
    } catch (error) {
      console.error('获取用户积分失败:', error);
      return null;
    }
  }

  /**
   * 添加积分
   */
  async addPoints(userId, points, ruleId = null, description = '', relatedData = {}) {
    try {
      await this.initializeUserPoints(userId);
      
      const userPoints = await db('user_points').where('user_id', userId).first();
      const newAvailablePoints = userPoints.available_points + points;
      const newTotalPoints = userPoints.total_points + points;

      // 更新用户积分
      await db('user_points')
        .where('user_id', userId)
        .update({
          total_points: newTotalPoints,
          available_points: newAvailablePoints,
          last_updated: new Date()
        });

      // 记录积分变化
      await db('points_records').insert({
        user_id: userId,
        points_rule_id: ruleId,
        record_type: 'earned',
        points_change: points,
        balance_after: newAvailablePoints,
        description: description,
        related_data: JSON.stringify(relatedData)
      });

      // 发送积分增加通知
      try {
        await createNotification(
          userId,
          'success',
          '🎉 积分增加',
          `恭喜获得 ${points} 积分！${description}`,
          {
            points_earned: points,
            balance_after: newAvailablePoints,
            rule_id: ruleId,
            related_data: relatedData
          }
        );
      } catch (notificationError) {
        console.error('发送积分增加通知失败:', notificationError);
      }

      return true;
    } catch (error) {
      console.error('添加积分失败:', error);
      return false;
    }
  }

  /**
   * 扣除积分
   */
  async deductPoints(userId, points, description = '', relatedData = {}) {
    try {
      const userPoints = await db('user_points').where('user_id', userId).first();
      if (!userPoints || userPoints.available_points < points) {
        return { success: false, error: '积分不足' };
      }

      const newAvailablePoints = userPoints.available_points - points;
      const newUsedPoints = userPoints.used_points + points;

      // 更新用户积分
      await db('user_points')
        .where('user_id', userId)
        .update({
          available_points: newAvailablePoints,
          used_points: newUsedPoints,
          last_updated: new Date()
        });

      // 记录积分变化
      await db('points_records').insert({
        user_id: userId,
        record_type: 'used',
        points_change: -points,
        balance_after: newAvailablePoints,
        description: description,
        related_data: JSON.stringify(relatedData)
      });

      // 发送积分扣除通知
      try {
        await createNotification(
          userId,
          'info',
          '💸 积分扣除',
          `已扣除 ${points} 积分。${description}`,
          {
            points_deducted: points,
            balance_after: newAvailablePoints,
            related_data: relatedData
          }
        );
      } catch (notificationError) {
        console.error('发送积分扣除通知失败:', notificationError);
      }

      return { success: true };
    } catch (error) {
      console.error('扣除积分失败:', error);
      return { success: false, error: '扣除积分失败' };
    }
  }

  /**
   * 检查并触发积分规则
   */
  async checkAndTriggerPointsRules(userId, triggerType, data = {}) {
    try {
      const rules = await db('points_rules')
        .where('trigger_type', triggerType)
        .where('is_active', true)
        .orderBy('sort_order', 'asc');

      for (const rule of rules) {
        const conditions = typeof rule.conditions === 'string' 
          ? JSON.parse(rule.conditions) 
          : rule.conditions;

        const shouldTrigger = await this.checkRuleCondition(userId, rule, conditions, data);
        
        if (shouldTrigger) {
          await this.addPoints(
            userId, 
            rule.points, 
            rule.id, 
            rule.description,
            { rule_id: rule.id, trigger_data: data }
          );

          // 发送积分规则触发通知
          try {
            await createNotification(
              userId,
              'success',
              '⭐ 积分规则触发',
              `触发规则"${rule.name}"，获得 ${rule.points} 积分！`,
              {
                rule_id: rule.id,
                rule_name: rule.name,
                points_earned: rule.points,
                trigger_type: rule.trigger_type,
                trigger_data: data
              }
            );
          } catch (notificationError) {
            console.error('发送积分规则触发通知失败:', notificationError);
          }
        }
      }
    } catch (error) {
      console.error('检查积分规则失败:', error);
    }
  }

  /**
   * 检查规则条件
   */
  async checkRuleCondition(userId, rule, conditions, data) {
    try {
      switch (rule.trigger_type) {
        case 'study_duration':
          return await this.checkStudyDurationCondition(userId, conditions, data);
        case 'project_completion':
          return await this.checkProjectCompletionCondition(userId, conditions, data);
        case 'consecutive_days':
          return await this.checkConsecutiveDaysCondition(userId, conditions, data);
        case 'efficiency_score':
          return await this.checkEfficiencyCondition(userId, conditions, data);
        default:
          return false;
      }
    } catch (error) {
      console.error('检查规则条件失败:', error);
      return false;
    }
  }

  /**
   * 检查学习时长条件
   */
  async checkStudyDurationCondition(userId, conditions, data) {
    const { duration_minutes = 60, points_per_hour = 10 } = conditions;
    const { duration_hours = 0 } = data;
    
    if (duration_hours >= duration_minutes / 60) {
      return true;
    }
    return false;
  }

  /**
   * 检查项目完成条件
   */
  async checkProjectCompletionCondition(userId, conditions, data) {
    const { points_per_project = 50 } = conditions;
    const { project_id } = data;
    
    if (project_id) {
      const project = await db('study_projects')
        .where({ id: project_id, user_id: userId, status: 'completed' })
        .first();
      return !!project;
    }
    return false;
  }

  /**
   * 检查连续学习条件
   */
  async checkConsecutiveDaysCondition(userId, conditions, data) {
    const { days_required = 7 } = conditions;
    
    // 获取用户连续学习天数
    const consecutiveDays = await this.getUserConsecutiveDays(userId);
    return consecutiveDays >= days_required;
  }

  /**
   * 检查效率条件
   */
  async checkEfficiencyCondition(userId, conditions, data) {
    const { min_efficiency = 80 } = conditions;
    const { efficiency_score = 0 } = data;
    
    return efficiency_score >= min_efficiency;
  }

  /**
   * 获取用户连续学习天数
   */
  async getUserConsecutiveDays(userId) {
    try {
      const sessions = await db('study_sessions')
        .where('user_id', userId)
        .orderBy('start_time', 'desc')
        .select('start_time');

      if (sessions.length === 0) return 0;

      let consecutiveDays = 0;
      let currentDate = moment().startOf('day');
      
      for (const session of sessions) {
        const sessionDate = moment(session.start_time).startOf('day');
        const diffDays = currentDate.diff(sessionDate, 'days');
        
        if (diffDays === consecutiveDays) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      
      return consecutiveDays;
    } catch (error) {
      console.error('获取连续学习天数失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有商品分类
   */
  async getProductCategories() {
    try {
      return await db('product_categories')
        .where('is_active', true)
        .orderBy('sort_order', 'asc');
    } catch (error) {
      console.error('获取商品分类失败:', error);
      return [];
    }
  }

  /**
   * 获取虚拟商品列表
   */
  async getVirtualProducts(filters = {}) {
    try {
      let query = db('virtual_products')
        .join('product_categories', 'virtual_products.category_id', 'product_categories.id')
        .select(
          'virtual_products.*',
          'product_categories.name as category_name',
          'product_categories.icon as category_icon'
        );

      // 如果不是管理端查询，只返回启用的商品
      if (!filters.admin) {
        query = query.where('virtual_products.is_active', true);
      }

      if (filters.category_id) {
        query = query.where('virtual_products.category_id', filters.category_id);
      }

      if (filters.max_points) {
        query = query.where('virtual_products.points_required', '<=', filters.max_points);
      }

      // 添加搜索功能
      if (filters.search) {
        query = query.where(function() {
          this.where('virtual_products.name', 'ILIKE', `%${filters.search}%`)
            .orWhere('virtual_products.description', 'ILIKE', `%${filters.search}%`);
        });
      }

      return await query.orderBy('virtual_products.sort_order', 'asc');
    } catch (error) {
      console.error('获取虚拟商品失败:', error);
      return [];
    }
  }

  /**
   * 获取管理端虚拟商品列表（包含所有状态）
   */
  async getAdminVirtualProducts(filters = {}) {
    try {
      let query = db('virtual_products')
        .join('product_categories', 'virtual_products.category_id', 'product_categories.id')
        .select(
          'virtual_products.*',
          'product_categories.name as category_name',
          'product_categories.icon as category_icon'
        );

      if (filters.category_id) {
        query = query.where('virtual_products.category_id', filters.category_id);
      }

      if (filters.max_points) {
        query = query.where('virtual_products.points_required', '<=', filters.max_points);
      }

      // 添加搜索功能
      if (filters.search) {
        query = query.where(function() {
          this.where('virtual_products.name', 'ILIKE', `%${filters.search}%`)
            .orWhere('virtual_products.description', 'ILIKE', `%${filters.search}%`);
        });
      }

      return await query.orderBy('virtual_products.sort_order', 'asc');
    } catch (error) {
      console.error('获取管理端虚拟商品失败:', error);
      return [];
    }
  }

  /**
   * 获取商品详情
   */
  async getProductById(productId) {
    try {
      return await db('virtual_products')
        .join('product_categories', 'virtual_products.category_id', 'product_categories.id')
        .where('virtual_products.id', productId)
        .where('virtual_products.is_active', true)
        .select(
          'virtual_products.*',
          'product_categories.name as category_name',
          'product_categories.icon as category_icon'
        )
        .first();
    } catch (error) {
      console.error('获取商品详情失败:', error);
      return null;
    }
  }

  /**
   * 检查用户是否可以兑换商品
   */
  async canUserExchangeProduct(userId, productId, quantity = 1) {
    try {
      const product = await this.getProductById(productId);
      if (!product) return { can: false, reason: '商品不存在' };

      const userPoints = await this.getUserPoints(userId);
      if (!userPoints || userPoints.available_points < product.points_required * quantity) {
        return { can: false, reason: '积分不足' };
      }

      // 检查库存
      if (product.stock_quantity !== -1 && product.stock_quantity <= 0) {
        return { can: false, reason: '库存不足' };
      }

      // 检查用户兑换限制
      const userStats = await db('user_exchange_stats')
        .where({ user_id: userId, product_id: productId })
        .first();

      if (userStats && userStats.exchange_count >= product.exchange_limit_per_user) {
        return { can: false, reason: '已达到兑换限制' };
      }

      return { can: true };
    } catch (error) {
      console.error('检查兑换条件失败:', error);
      return { can: false, reason: '系统错误' };
    }
  }

  /**
   * 兑换商品
   */
  async exchangeProduct(userId, productId, quantity = 1) {
    try {
      const canExchange = await this.canUserExchangeProduct(userId, productId, quantity);
      if (!canExchange.can) {
        return { success: false, error: canExchange.reason };
      }

      const product = await this.getProductById(productId);
      const totalPoints = product.points_required * quantity;
      
      // 扣除积分
      const deductResult = await this.deductPoints(
        userId, 
        totalPoints, 
        `兑换商品: ${product.name} x${quantity}`,
        { product_id: productId, product_name: product.name, quantity: quantity }
      );

      if (!deductResult.success) {
        return deductResult;
      }

      // 创建兑换记录
      const inserted = await db('exchange_records').insert({
        user_id: userId,
        product_id: productId,
        points_spent: totalPoints,
        quantity: quantity,
        status: product.requires_approval ? 'pending' : 'completed',
        completed_at: product.requires_approval ? null : new Date()
      }, ['id']);
      const exchangeId = Array.isArray(inserted) && inserted.length > 0
        ? (inserted[0].id || inserted[0])
        : null;

      // 更新库存
      if (product.stock_quantity !== -1) {
        await db('virtual_products')
          .where('id', productId)
          .decrement('stock_quantity', quantity);
      }

      // 更新用户兑换统计
      await db('user_exchange_stats')
        .insert({
          user_id: userId,
          product_id: productId,
          exchange_count: quantity,
          total_points_spent: totalPoints,
          last_exchange_at: new Date()
        })
        .onConflict(['user_id', 'product_id'])
        .merge({
          exchange_count: db.raw('user_exchange_stats.exchange_count + ?', [quantity]),
          total_points_spent: db.raw('user_exchange_stats.total_points_spent + ?', [totalPoints]),
          last_exchange_at: new Date()
        });

      // 发送兑换成功通知
      try {
        if (product.requires_approval) {
          await createNotification(
            userId,
            'info',
            '📋 兑换申请已提交',
            `您的兑换申请"${product.name} x${quantity}"已提交，等待管理员审核。`,
            {
              exchange_id: exchangeId,
              product_id: productId,
              product_name: product.name,
              points_spent: totalPoints,
              quantity: quantity,
              status: 'pending'
            }
          );
        } else {
          await createNotification(
            userId,
            'success',
            '🎉 兑换成功',
            `恭喜成功兑换"${product.name} x${quantity}"！`,
            {
              exchange_id: exchangeId,
              product_id: productId,
              product_name: product.name,
              points_spent: totalPoints,
              quantity: quantity,
              status: 'completed'
            }
          );
        }
      } catch (notificationError) {
        console.error('发送兑换通知失败:', notificationError);
      }

      return { 
        success: true, 
        exchange_id: exchangeId,
        requires_approval: product.requires_approval,
        quantity: quantity,
        total_points: totalPoints
      };
    } catch (error) {
      console.error('兑换商品失败:', error);
      return { success: false, error: '兑换失败' };
    }
  }

  /**
   * 获取用户兑换记录
   */
  async getUserExchangeRecords(userId, filters = {}) {
    try {
      const { page = 1, limit = 10, search } = filters;
      const offset = (page - 1) * limit;

      // 只用于获取总数
      const totalQuery = db('exchange_records')
        .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
        .where('exchange_records.user_id', userId);
      if (filters.status) {
        totalQuery.where('exchange_records.status', filters.status);
      }
      if (search) {
        totalQuery.where(function() {
          this.where('virtual_products.name', 'ILIKE', `%${search}%`)
              .orWhere('virtual_products.description', 'ILIKE', `%${search}%`);
        });
      }
      const [{ total }] = await totalQuery.count('* as total');

      // 获取分页数据
      let baseQuery = db('exchange_records')
        .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
        .where('exchange_records.user_id', userId);
      if (filters.status) {
        baseQuery = baseQuery.where('exchange_records.status', filters.status);
      }
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('virtual_products.name', 'ILIKE', `%${search}%`)
              .orWhere('virtual_products.description', 'ILIKE', `%${search}%`);
        });
      }
      const records = await baseQuery
        .select(
          'exchange_records.*',
          'virtual_products.name as product_name',
          'virtual_products.image_url as product_image',
          'virtual_products.description as product_description'
        )
        .orderBy('exchange_records.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('获取兑换记录失败:', error);
      return {
        success: false,
        error: '获取兑换记录失败'
      };
    }
  }

  /**
   * 获取积分记录
   */
  async getPointsRecords(userId, filters = {}) {
    try {
      const { page = 1, limit = 10, search, record_type } = filters;
      const offset = (page - 1) * limit;

      // 构建基础查询（包含所有搜索条件）
      let baseQuery = db('points_records')
        .leftJoin('points_rules', 'points_records.points_rule_id', 'points_rules.id')
        .where('points_records.user_id', userId);

      // 添加记录类型筛选
      if (record_type) {
        baseQuery = baseQuery.where('points_records.record_type', record_type);
      }

      // 添加搜索条件
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('points_records.description', 'ILIKE', `%${search}%`)
            .orWhere('points_rules.name', 'ILIKE', `%${search}%`);
        });
      }

      // 获取总数（使用相同的查询条件）
      const [{ total }] = await baseQuery.clone().count('* as total');

      // 获取分页数据（使用相同的查询条件）
      const records = await baseQuery
        .select(
          'points_records.*',
          'points_rules.name as rule_name'
        )
        .orderBy('points_records.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      console.log('积分记录查询参数:', { userId, page, limit, search, record_type });
      console.log('积分记录查询结果:', { total, recordsCount: records.length });

      return {
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('获取积分记录失败:', error);
      return {
        success: false,
        error: '获取积分记录失败'
      };
    }
  }

  /**
   * 管理员审核兑换申请
   */
  async approveExchange(exchangeId, adminId, approved, notes = '') {
    try {
      const exchange = await db('exchange_records')
        .where('id', exchangeId)
        .first();

      if (!exchange) {
        return { success: false, error: '兑换记录不存在' };
      }

      const status = approved ? 'approved' : 'rejected';
      const updateData = {
        status: status,
        approval_notes: notes,
        approved_by: adminId,
        approved_at: new Date()
      };

      if (approved) {
        updateData.completed_at = new Date();
      }

      await db('exchange_records')
        .where('id', exchangeId)
        .update(updateData);

      // 发送审核结果通知
      try {
        const product = await this.getProductById(exchange.product_id);
        const notificationType = approved ? 'success' : 'warning';
        const notificationTitle = approved ? '✅ 兑换申请已通过' : '❌ 兑换申请被拒绝';
        const notificationMessage = approved 
          ? `您的兑换申请"${product.name}"已通过审核！`
          : `您的兑换申请"${product.name}"被拒绝。${notes ? `原因：${notes}` : ''}`;

        await createNotification(
          exchange.user_id,
          notificationType,
          notificationTitle,
          notificationMessage,
          {
            exchange_id: exchangeId,
            product_id: exchange.product_id,
            product_name: product ? product.name : '未知商品',
            points_spent: exchange.points_spent,
            status: status,
            approval_notes: notes,
            approved_by: adminId
          }
        );
      } catch (notificationError) {
        console.error('发送审核结果通知失败:', notificationError);
      }

      return { success: true };
    } catch (error) {
      console.error('审核兑换申请失败:', error);
      return { success: false, error: '审核失败' };
    }
  }

  /**
   * 获取待审核的兑换申请
   */
  async getPendingExchanges() {
    try {
      return await db('exchange_records')
        .join('virtual_products', 'exchange_records.product_id', 'virtual_products.id')
        .join('users', 'exchange_records.user_id', 'users.id')
        .where('exchange_records.status', 'pending')
        .select(
          'exchange_records.*',
          'virtual_products.name as product_name',
          'virtual_products.image_url as product_image',
          'users.username',
          'users.email'
        )
        .orderBy('exchange_records.created_at', 'asc');
    } catch (error) {
      console.error('获取待审核兑换申请失败:', error);
      return [];
    }
  }

  /**
   * 获取积分规则列表
   */
  async getPointsRules() {
    try {
      return await db('points_rules')
        .orderBy('sort_order', 'asc')
        .orderBy('id', 'asc');
    } catch (error) {
      console.error('获取积分规则失败:', error);
      return [];
    }
  }

  /**
   * 创建积分规则
   */
  async createPointsRule(ruleData) {
    try {
      const [rule] = await db('points_rules').insert({
        ...ruleData,
        conditions: typeof ruleData.conditions === 'string' 
          ? ruleData.conditions 
          : JSON.stringify(ruleData.conditions)
      }).returning('id');
      return { success: true, rule_id: rule.id };
    } catch (error) {
      console.error('创建积分规则失败:', error);
      return { success: false, error: '创建失败' };
    }
  }

  /**
   * 更新积分规则
   */
  async updatePointsRule(ruleId, ruleData) {
    try {
      await db('points_rules')
        .where('id', ruleId)
        .update({
          ...ruleData,
          conditions: typeof ruleData.conditions === 'string' 
            ? ruleData.conditions 
            : JSON.stringify(ruleData.conditions)
        });
      return { success: true };
    } catch (error) {
      console.error('更新积分规则失败:', error);
      return { success: false, error: '更新失败' };
    }
  }

  /**
   * 删除积分规则
   */
  async deletePointsRule(ruleId) {
    try {
      await db('points_rules').where('id', ruleId).del();
      return { success: true };
    } catch (error) {
      console.error('删除积分规则失败:', error);
      return { success: false, error: '删除失败' };
    }
  }
}

module.exports = new PointsExchangeService(); 