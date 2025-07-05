const { db } = require('../database/db');
const { createNotification } = require('../routes/notifications');
const moment = require('moment');

class StudyRemindersService {
  /**
   * 检查连续学习天数并发送提醒
   */
  async checkConsecutiveDays(userId) {
    try {
      const consecutiveDays = await this.getUserConsecutiveDays(userId);
      const today = new Date().toISOString().split('T')[0];
      
      // 连续学习3天提醒
      if (consecutiveDays === 3) {
        const existingNotification = await db('notifications')
          .where('user_id', userId)
          .where('title', '🔥 连续学习3天')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingNotification) {
          await createNotification(
            userId,
            'success',
            '🔥 连续学习3天',
            '恭喜！您已经连续学习3天了，继续保持这个好习惯！',
            {
              consecutive_days: consecutiveDays,
              reminder_type: 'consecutive_3_days'
            }
          );
        }
      }
      
      // 连续学习7天提醒
      if (consecutiveDays === 7) {
        const existingNotification = await db('notifications')
          .where('user_id', userId)
          .where('title', '🎉 连续学习一周')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingNotification) {
          await createNotification(
            userId,
            'success',
            '🎉 连续学习一周',
            '太棒了！您已经连续学习一周了，这是一个了不起的成就！',
            {
              consecutive_days: consecutiveDays,
              reminder_type: 'consecutive_7_days'
            }
          );
        }
      }
      
      // 连续学习30天提醒
      if (consecutiveDays === 30) {
        const existingNotification = await db('notifications')
          .where('user_id', userId)
          .where('title', '🏆 连续学习一个月')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingNotification) {
          await createNotification(
            userId,
            'success',
            '🏆 连续学习一个月',
            '恭喜！您已经连续学习一个月了，您是一个真正的学习达人！',
            {
              consecutive_days: consecutiveDays,
              reminder_type: 'consecutive_30_days'
            }
          );
        }
      }
    } catch (error) {
      console.error('检查连续学习天数失败:', error);
    }
  }

  /**
   * 获取用户连续学习天数
   */
  async getUserConsecutiveDays(userId) {
    try {
      const today = new Date();
      const sessions = await db('study_sessions')
        .where('user_id', userId)
        .whereNotNull('duration')
        .where('duration', '>', 0)
        .select('study_date')
        .orderBy('study_date', 'desc');

      if (sessions.length === 0) return 0;

      const dates = [...new Set(sessions.map(s => s.study_date))];
      let consecutiveDays = 0;
      let currentDate = moment(today).format('YYYY-MM-DD');

      for (let i = 0; i < 365; i++) { // 最多检查一年
        const checkDate = moment(currentDate).subtract(i, 'days').format('YYYY-MM-DD');
        if (dates.includes(checkDate)) {
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
   * 检查学习目标完成情况
   */
  async checkStudyGoals(userId) {
    try {
      // 获取用户今日学习时长
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = await db('study_sessions')
        .where('user_id', userId)
        .where('study_date', today)
        .sum('duration as total_duration');
      
      const todayMinutes = todaySessions[0]?.total_duration || 0;
      const todayHours = todayMinutes / 60;

      // 检查是否达到每日学习目标（默认1小时）
      if (todayHours >= 1 && todayHours < 2) {
        const existingNotification = await db('notifications')
          .where('user_id', userId)
          .where('title', '✅ 今日学习目标达成')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingNotification) {
          await createNotification(
            userId,
            'success',
            '✅ 今日学习目标达成',
            `您今天已经学习了 ${todayHours.toFixed(1)} 小时，目标达成！`,
            {
              today_minutes: todayMinutes,
              today_hours: todayHours,
              goal_hours: 1
            }
          );
        }
      }

      // 检查是否超过2小时学习
      if (todayHours >= 2) {
        const existingNotification = await db('notifications')
          .where('user_id', userId)
          .where('title', '💪 学习毅力提醒')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingNotification) {
          await createNotification(
            userId,
            'info',
            '💪 学习毅力提醒',
            `您今天已经学习了 ${todayHours.toFixed(1)} 小时，建议适当休息！`,
            {
              today_minutes: todayMinutes,
              today_hours: todayHours
            }
          );
        }
      }
    } catch (error) {
      console.error('检查学习目标失败:', error);
    }
  }

  /**
   * 检查项目截止日期提醒
   */
  async checkProjectDeadlines(userId) {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      // 查找即将到期的项目
      const upcomingProjects = await db('study_projects')
        .where('user_id', userId)
        .where('status', '!=', 'completed')
        .whereNotNull('completion_date')
        .where('completion_date', '>=', today.toISOString().split('T')[0])
        .where('completion_date', '<=', dayAfterTomorrow.toISOString().split('T')[0]);

      for (const project of upcomingProjects) {
        const deadline = moment(project.completion_date);
        const daysUntilDeadline = deadline.diff(moment(today), 'days');

        if (daysUntilDeadline === 0) {
          await createNotification(
            userId,
            'urgent',
            '⚠️ 项目今日到期',
            `项目"${project.name}"今天到期，请及时完成！`,
            {
              project_id: project.id,
              project_name: project.name,
              deadline: project.completion_date,
              days_until_deadline: daysUntilDeadline
            }
          );
        } else if (daysUntilDeadline === 1) {
          await createNotification(
            userId,
            'upcoming',
            '📅 项目明日到期',
            `项目"${project.name}"明天到期，请抓紧时间完成！`,
            {
              project_id: project.id,
              project_name: project.name,
              deadline: project.completion_date,
              days_until_deadline: daysUntilDeadline
            }
          );
        } else if (daysUntilDeadline === 2) {
          await createNotification(
            userId,
            'info',
            '📋 项目即将到期',
            `项目"${project.name}"还有2天到期，请注意时间安排。`,
            {
              project_id: project.id,
              project_name: project.name,
              deadline: project.completion_date,
              days_until_deadline: daysUntilDeadline
            }
          );
        }
      }
    } catch (error) {
      console.error('检查项目截止日期失败:', error);
    }
  }

  /**
   * 发送学习建议
   */
  async sendStudySuggestions(userId) {
    try {
      // 检查今天是否已经发送过学习建议通知
      const today = new Date().toISOString().split('T')[0];
      const existingNotification = await db('notifications')
        .where('user_id', userId)
        .where('title', '🌟 学习表现优秀')
        .where('created_at', '>=', `${today} 00:00:00`)
        .where('created_at', '<', `${today} 23:59:59`)
        .first();

      if (existingNotification) {
        console.log(`用户 ${userId} 今天已经收到学习表现优秀通知，跳过`);
        return;
      }

      // 获取用户最近7天的学习数据
      const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY-MM-DD');
      const recentSessions = await db('study_sessions')
        .where('user_id', userId)
        .where('study_date', '>=', sevenDaysAgo)
        .sum('duration as total_duration');

      const totalMinutes = recentSessions[0]?.total_duration || 0;
      const totalHours = totalMinutes / 60;
      const averageHours = totalHours / 7;

      // 根据学习情况发送建议
      if (averageHours < 0.5) {
        // 检查是否已经发送过学习建议
        const existingWarning = await db('notifications')
          .where('user_id', userId)
          .where('title', '📚 学习建议')
          .where('created_at', '>=', `${today} 00:00:00`)
          .where('created_at', '<', `${today} 23:59:59`)
          .first();

        if (!existingWarning) {
          await createNotification(
            userId,
            'warning',
            '📚 学习建议',
            '您最近的学习时间较少，建议每天至少学习30分钟。',
            {
              average_hours: averageHours,
              total_hours: totalHours,
              suggestion_type: 'increase_study_time'
            }
          );
        }
      } else if (averageHours >= 2) {
        await createNotification(
          userId,
          'success',
          '🌟 学习表现优秀',
          `您最近平均每天学习 ${averageHours.toFixed(1)} 小时，继续保持！`,
          {
            average_hours: averageHours,
            total_hours: totalHours,
            suggestion_type: 'excellent_performance'
          }
        );
      }
    } catch (error) {
      console.error('发送学习建议失败:', error);
    }
  }

  /**
   * 运行所有提醒检查
   */
  async runAllReminders(userId) {
    try {
      await Promise.all([
        this.checkConsecutiveDays(userId),
        this.checkStudyGoals(userId),
        this.checkProjectDeadlines(userId),
        this.sendStudySuggestions(userId)
      ]);
    } catch (error) {
      console.error('运行提醒检查失败:', error);
    }
  }
}

module.exports = new StudyRemindersService(); 