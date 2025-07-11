console.log('=== ACHIEVEMENTS SERVICE LOADED - VERSION WITH FIXES ===');
const { db } = require('../database/db');
const moment = require('moment');

class AchievementService {
  /**
   * 检查并更新用户成就
   * @param {number} userId 用户ID
   * @param {string} triggerType 触发类型
   * @param {object} data 相关数据
   */
  async checkAndUpdateAchievements(userId, triggerType, data = {}) {
    try {
      // 获取所有相关的成就定义
      const achievements = await this.getAchievementsByTriggerType(triggerType);
      
      for (const achievement of achievements) {
        if (!achievement.is_active) continue;
        
        // 检查是否已经完成
        const userAchievement = await this.getUserAchievement(userId, achievement.id);
        if (userAchievement && userAchievement.is_completed) continue;
        
        // 检查是否满足条件
        const isCompleted = await this.checkAchievementCondition(userId, achievement, data);
        
        if (isCompleted) {
          await this.completeAchievement(userId, achievement, data);
        } else {
          // 更新进度
          await this.updateAchievementProgress(userId, achievement, data);
        }
      }
    } catch (error) {
      console.error('检查成就时出错:', error);
    }
  }

  /**
   * 根据触发类型获取成就定义
   */
  async getAchievementsByTriggerType(triggerType) {
    return await db('achievements')
      .join('achievement_categories', 'achievements.category_id', 'achievement_categories.id')
      .where('achievements.trigger_type', triggerType)
      .where('achievements.is_active', true)
      .select(
        'achievements.*',
        'achievement_categories.name as category_name',
        'achievement_categories.icon as category_icon'
      )
      .orderBy('achievements.level', 'asc')
      .orderBy('achievements.sort_order', 'asc');
  }

  /**
   * 获取用户成就记录
   */
  async getUserAchievement(userId, achievementId) {
    return await db('user_achievements')
      .where({ user_id: userId, achievement_id: achievementId })
      .first();
  }

  /**
   * 检查成就条件是否满足
   */
  async checkAchievementCondition(userId, achievement, data) {
    const config = achievement.trigger_conditions || {};
    const criteriaType = achievement.trigger_type;
    
    switch (criteriaType) {
      case 'total_duration':
      case 'total_hours':
        return await this.checkTotalDurationCondition(userId, config);
      case 'consecutive_days':
        return await this.checkConsecutiveDaysCondition(userId, config);
      case 'project_completion':
        return await this.checkProjectCompletionCondition(userId, config);
      case 'efficiency':
        return await this.checkEfficiencyCondition(userId, config);
      default:
        return false;
    }
  }

  /**
   * 检查总学习时长条件
   */
  async checkTotalDurationCondition(userId, config) {
    // 支持两种配置方式：hours（小时）和 target_minutes（分钟）
    let targetMinutes;
    if (config.hours) {
      targetMinutes = config.hours * 60; // 将小时转换为分钟
    } else {
      targetMinutes = config.target_minutes || 600; // 默认10小时
    }
    
    const totalMinutes = await this.getUserTotalMinutes(userId);
    return totalMinutes >= targetMinutes;
  }

  /**
   * 检查连续学习天数条件
   */
  async checkConsecutiveDaysCondition(userId, config) {
    const targetDays = config.target_days || 7;
    const consecutiveDays = await this.getUserConsecutiveDays(userId);
    return consecutiveDays >= targetDays;
  }

  /**
   * 检查项目完成条件
   */
  async checkProjectCompletionCondition(userId, config) {
    const requiredCount = config.target_count || 1;
    const completedProjects = await this.getUserCompletedProjects(userId);
    return completedProjects >= requiredCount;
  }

  /**
   * 检查效率条件
   */
  async checkEfficiencyCondition(userId, config) {
    // 实现效率检查逻辑
    return false;
  }

  /**
   * 获取用户总学习时长（分钟）
   */
  async getUserTotalMinutes(userId) {
    const result = await db('study_sessions')
      .where('user_id', userId)
      .sum('duration as total_minutes')
      .first();
    
    return parseInt(result.total_minutes || 0);
  }

  /**
   * 获取用户连续学习天数
   */
  async getUserConsecutiveDays(userId) {
    const sessions = await db('study_sessions')
      .where('user_id', userId)
      .select('study_date')
      .orderBy('study_date', 'desc');

    if (sessions.length === 0) return 0;

    const dates = sessions.map(s => moment(s.study_date).format('YYYY-MM-DD'));
    const uniqueDates = [...new Set(dates)].sort().reverse();
    
    let consecutiveDays = 0;
    let currentDate = moment();
    
    for (const dateStr of uniqueDates) {
      const sessionDate = moment(dateStr);
      const diffDays = currentDate.diff(sessionDate, 'days');
      
      if (diffDays === consecutiveDays) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    return consecutiveDays;
  }

  /**
   * 获取用户完成的项目数量
   */
  async getUserCompletedProjects(userId) {
    const result = await db('study_projects')
      .where({ user_id: userId, status: 'completed' })
      .count('* as count')
      .first();
    
    return parseInt(result.count || 0);
  }

  /**
   * 完成成就
   */
  async completeAchievement(userId, achievement, data) {
    const completionData = {
      completed_at: new Date(),
      trigger_data: data,
      points_earned: achievement.points
    };

    // 插入或更新用户成就记录
    await db('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        is_completed: true,
        completed_at: new Date(),
        completion_data: JSON.stringify(completionData)
      })
      .onConflict(['user_id', 'achievement_id'])
      .merge({
        is_completed: true,
        completed_at: new Date(),
        completion_data: JSON.stringify(completionData)
      });

    // 发送通知
    await this.sendAchievementNotification(userId, achievement);
  }

  /**
   * 获取成就所需进度
   */
  getRequiredProgress(achievement) {
    const config = achievement.trigger_conditions || {};
    const criteriaType = achievement.trigger_type;
    switch (criteriaType) {
      case 'total_duration':
        return config.target_minutes || 600;
      case 'total_hours':
        return (config.hours || 1) * 60; // 将小时转换为分钟
      case 'consecutive_days':
        return config.target_days || 7;
      case 'project_completion':
        return config.target_count || 1;
      default:
        return 1;
    }
  }

  /**
   * 更新成就进度
   */
  async updateAchievementProgress(userId, achievement, data) {
    const currentProgress = await this.calculateCurrentProgress(userId, achievement);
    
    const progressData = {
      current_progress: currentProgress,
      target_progress: this.getRequiredProgress(achievement),
      last_updated: new Date(),
      trigger_data: data
    };
    
    await db('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        current_progress: currentProgress,
        completion_data: JSON.stringify(progressData)
      })
      .onConflict(['user_id', 'achievement_id'])
      .merge({
        current_progress: currentProgress,
        completion_data: JSON.stringify(progressData)
      });
  }

  /**
   * 计算当前进度
   */
  async calculateCurrentProgress(userId, achievement) {
    const config = achievement.trigger_conditions || {};
    const criteriaType = achievement.trigger_type;
    
    switch (criteriaType) {
      case 'total_duration':
      case 'total_hours':
        const totalMinutes = await this.getUserTotalMinutes(userId);
        return totalMinutes;
      case 'consecutive_days':
        return await this.getUserConsecutiveDays(userId);
      case 'project_completion':
        return await this.getUserCompletedProjects(userId);
      default:
        return 0;
    }
  }

  /**
   * 发送成就通知
   */
  async sendAchievementNotification(userId, achievement) {
    try {
      const notificationData = {
        user_id: userId,
        type: 'achievement',
        title: '🎉 恭喜获得新成就！',
        message: `你获得了"${achievement.name}"成就！${achievement.description}`,
        data: {
          achievement_id: achievement.id,
          achievement_name: achievement.name,
          points_earned: achievement.points
        },
        read: false
      };

      await db('notifications').insert(notificationData);
    } catch (error) {
      console.error('发送成就通知失败:', error);
    }
  }

  /**
   * 获取用户所有成就
   */
  async getUserAchievements(userId) {
    return await db('user_achievements')
      .join('achievements', 'user_achievements.achievement_id', 'achievements.id')
      .join('achievement_categories', 'achievements.category_id', 'achievement_categories.id')
      .where('user_achievements.user_id', userId)
      .select(
        'user_achievements.*',
        'achievements.name as achievement_name',
        'achievements.description as achievement_description',
        'achievements.icon as achievement_icon',
        'achievements.points',
        'achievements.trigger_conditions as criteria_config',
        'achievements.trigger_type',
        'achievement_categories.name as category_name',
        'achievement_categories.icon as category_icon'
      )
      .orderBy('user_achievements.completed_at', 'desc');
  }

  /**
   * 获取用户成就列表（支持分页和搜索）
   */
  async getUserAchievementsWithPagination(userId, filters = {}) {
    try {
      const { page = 1, limit = 10, search, status } = filters;
      const offset = (page - 1) * limit;

      // 获取总数
      let countQuery = db('user_achievements as ua')
        .join('achievements as a', 'ua.achievement_id', 'a.id')
        .join('achievement_categories as ac', 'a.category_id', 'ac.id')
        .where('ua.user_id', userId);
      
      if (status) {
        countQuery = countQuery.where('ua.status', status);
      }
      
      if (search) {
        countQuery = countQuery.where(function() {
          this.where('a.name', 'ILIKE', `%${search}%`)
            .orWhere('a.description', 'ILIKE', `%${search}%`)
            .orWhere('ac.name', 'ILIKE', `%${search}%`);
        });
      }
      
      const [{ total }] = await countQuery.count('* as total');

      // 获取分页数据
      let query = db('user_achievements as ua')
        .join('achievements as a', 'ua.achievement_id', 'a.id')
        .join('achievement_categories as ac', 'a.category_id', 'ac.id')
        .where('ua.user_id', userId)
        .select(
          'ua.id',
          'ua.user_id',
          'ua.achievement_id',
          'ua.is_completed',
          'ua.current_progress',
          'ua.completed_at',
          'ua.created_at',
          'ua.updated_at',
          'ua.completion_data',
          'a.name as achievement_name',
          'a.description as achievement_description',
          'a.icon as achievement_icon',
          'a.points',
          'a.trigger_conditions as criteria_config',
          'a.trigger_type',
          'ac.name as category_name',
          'ac.icon as category_icon'
        );

      if (status) {
        query = query.where('ua.status', status);
      }

      if (search) {
        query = query.where(function() {
          this.where('a.name', 'ILIKE', `%${search}%`)
            .orWhere('a.description', 'ILIKE', `%${search}%`)
            .orWhere('ac.name', 'ILIKE', `%${search}%`);
        });
      }

      const achievements = await query
        .orderBy('ua.completed_at', 'desc')
        .orderBy('ua.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          achievements,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('获取用户成就失败:', error);
      return {
        success: false,
        error: '获取用户成就失败'
      };
    }
  }

  /**
   * 获取用户成就统计
   */
  async getUserAchievementStats(userId) {
    const achievements = await this.getUserAchievements(userId);
    const completed = achievements.filter(a => {
      try {
        const progressData = a.progress_data || {};
        return progressData.completed_at || (progressData.current_progress && progressData.target_progress && progressData.current_progress >= progressData.target_progress);
      } catch (error) {
        console.error('解析成就进度数据失败:', error);
        return false;
      }
    });
    const totalPoints = completed.reduce((sum, a) => sum + (a.points || 0), 0);
    
    return {
      total_achievements: achievements.length,
      completed_achievements: completed.length,
      total_points: totalPoints,
      completion_rate: achievements.length > 0 ? (completed.length / achievements.length * 100).toFixed(1) : 0
    };
  }

  /**
   * 获取所有成就分类（去重）
   */
  async getAchievementCategories() {
    const raw = await db('achievement_categories')
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    // 去重（以id为唯一）
    const seen = new Set();
    const categories = [];
    for (const cat of raw) {
      if (!seen.has(cat.id)) {
        categories.push(cat);
        seen.add(cat.id);
      }
    }
    return categories;
  }

  /**
   * 获取分类下的成就
   */
  async getAchievementsByCategory(categoryId) {
    return await db('achievements')
      .where({ category_id: categoryId, is_active: true })
      .orderBy('level', 'asc')
      .orderBy('sort_order', 'asc');
  }

  /**
   * 获取所有成就定义（字段别名与前端一致）
   */
  async getAllAchievements() {
    return await db('achievements')
      .join('achievement_categories', 'achievements.category_id', 'achievement_categories.id')
      .select(
        'achievements.id',
        'achievements.name as achievement_name',
        'achievements.description as achievement_description',
        'achievements.icon as achievement_icon',
        'achievements.points',
        'achievements.trigger_conditions as criteria_config',
        'achievements.trigger_type',
        'achievement_categories.id as category_id',
        'achievement_categories.name as category_name',
        'achievement_categories.icon as category_icon'
      )
      .where('achievements.is_active', true)
      .orderBy('achievement_categories.sort_order', 'asc')
      .orderBy('achievements.level', 'asc')
      .orderBy('achievements.sort_order', 'asc');
  }
}

module.exports = new AchievementService(); 