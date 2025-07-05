/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // 清空现有数据
  await knex('system_config').del();

  // 插入系统基本配置
  await knex('system_config').insert([
    {
      key: 'systemName',
      value: '学习项目追踪系统',
      description: '系统名称',
      type: 'string'
    },
    {
      key: 'systemVersion',
      value: '2.0.0',
      description: '系统版本号',
      type: 'string'
    },
    {
      key: 'adminEmail',
      value: 'admin@study-tracker.com',
      description: '管理员邮箱',
      type: 'string'
    },
    {
      key: 'timezone',
      value: 'Asia/Shanghai',
      description: '系统时区',
      type: 'string'
    },
    {
      key: 'defaultStudyTime',
      value: '25',
      description: '默认学习时长（分钟）',
      type: 'number'
    },
    {
      key: 'dailyGoal',
      value: '120',
      description: '每日学习目标（分钟）',
      type: 'number'
    },
    {
      key: 'reminderTime',
      value: '09:00',
      description: '提醒时间',
      type: 'string'
    },
    {
      key: 'autoSaveInterval',
      value: '30',
      description: '自动保存间隔（秒）',
      type: 'number'
    },
    {
      key: 'browserNotifications',
      value: 'true',
      description: '启用浏览器通知',
      type: 'boolean'
    },
    {
      key: 'studyReminders',
      value: 'true',
      description: '启用学习提醒',
      type: 'boolean'
    },
    {
      key: 'sessionTimeout',
      value: '30',
      description: '会话超时时间（分钟）',
      type: 'number'
    },
    {
      key: 'maxLoginAttempts',
      value: '5',
      description: '最大登录尝试次数',
      type: 'number'
    },
    {
      key: 'minPasswordLength',
      value: '8',
      description: '密码最小长度',
      type: 'number'
    },
    {
      key: 'backupFrequency',
      value: '7',
      description: '数据备份频率（天）',
      type: 'number'
    },
    {
      key: 'debugMode',
      value: 'false',
      description: '调试模式',
      type: 'boolean'
    },
    {
      key: 'maintenanceMode',
      value: 'false',
      description: '维护模式',
      type: 'boolean'
    },
    // SMTP配置（保留现有的）
    {
      key: 'smtp_enabled',
      value: 'true',
      description: '是否启用SMTP邮件服务',
      type: 'boolean'
    },
    {
      key: 'email_verification_enabled',
      value: 'true',
      description: '是否启用邮箱验证功能',
      type: 'boolean'
    },
    {
      key: 'smtp_provider',
      value: 'qq',
      description: '邮箱服务提供商',
      type: 'string'
    },
    {
      key: 'smtp_secure',
      value: 'false',
      description: '是否使用SSL/TLS加密',
      type: 'boolean'
    },
    {
      key: 'smtp_host',
      value: 'smtp.qq.com',
      description: 'SMTP服务器地址',
      type: 'string'
    },
    {
      key: 'smtp_port',
      value: '587',
      description: 'SMTP服务器端口',
      type: 'number'
    },
    {
      key: 'smtp_user',
      value: '522796410@qq.com',
      description: 'SMTP用户名/邮箱',
      type: 'string'
    },
    {
      key: 'smtp_pass',
      value: 'hmuekezyyapfbhaa',
      description: 'SMTP密码/授权码',
      type: 'string'
    },
    {
      key: 'smtp_from_name',
      value: '学习项目追踪系统',
      description: '发件人显示名称',
      type: 'string'
    },
    {
      key: 'smtp_from_email',
      value: '522796410@qq.com',
      description: '发件人邮箱地址',
      type: 'string'
    },
    {
      key: 'verification_code_expire',
      value: '10',
      description: '验证码有效期（分钟）',
      type: 'number'
    },
    {
      key: 'email_rate_limit',
      value: '60',
      description: '邮件发送频率限制（秒）',
      type: 'number'
    }
  ]);
}; 