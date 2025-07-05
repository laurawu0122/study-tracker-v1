const { db } = require('../database/db');
const studyRemindersService = require('./study-reminders');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.isRunning) {
      console.log('定时任务已经在运行中');
      return;
    }

    console.log('启动定时任务服务...');
    this.isRunning = true;

    // 每6小时运行一次提醒检查（避免过于频繁）
    this.interval = setInterval(async () => {
      await this.runDailyReminders();
    }, 6 * 60 * 60 * 1000); // 6小时

    // 立即运行一次
    this.runDailyReminders();
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('定时任务已停止');
  }

  /**
   * 运行每日提醒检查
   */
  async runDailyReminders() {
    try {
      console.log('开始运行每日提醒检查...');
      
      // 获取所有活跃用户
      const users = await db('users')
        .select('id', 'username')
        .where('is_active', true);

      console.log(`找到 ${users.length} 个活跃用户`);

      for (const user of users) {
        try {
          await studyRemindersService.runAllReminders(user.id);
          console.log(`用户 ${user.username} 的提醒检查完成`);
        } catch (error) {
          console.error(`用户 ${user.username} 的提醒检查失败:`, error);
        }
      }

      console.log('每日提醒检查完成');
    } catch (error) {
      console.error('运行每日提醒检查失败:', error);
    }
  }

  /**
   * 手动运行提醒检查（用于测试）
   */
  async runRemindersForUser(userId) {
    try {
      await studyRemindersService.runAllReminders(userId);
      console.log(`用户 ${userId} 的提醒检查完成`);
    } catch (error) {
      console.error(`用户 ${userId} 的提醒检查失败:`, error);
    }
  }

  /**
   * 获取定时任务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

module.exports = new SchedulerService(); 