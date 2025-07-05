/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 开始添加SMTP邮箱配置...');
  
  // 添加SMTP邮箱配置项
  const smtpConfigs = [
    {
      key: 'smtp_enabled',
      value: 'false',
      description: '是否启用SMTP邮件服务',
      type: 'boolean'
    },
    {
      key: 'smtp_host',
      value: '',
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
      value: '',
      description: 'SMTP用户名/邮箱',
      type: 'string'
    },
    {
      key: 'smtp_pass',
      value: '',
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
      value: '',
      description: '发件人邮箱地址',
      type: 'string'
    },
    {
      key: 'smtp_secure',
      value: 'false',
      description: '是否使用SSL/TLS加密',
      type: 'boolean'
    },
    {
      key: 'smtp_provider',
      value: 'custom',
      description: '邮箱服务提供商',
      type: 'string'
    },
    {
      key: 'email_verification_enabled',
      value: 'true',
      description: '是否启用邮箱验证功能',
      type: 'boolean'
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
  ];

  // 插入配置项
  for (const config of smtpConfigs) {
    await knex('system_config').insert({
      ...config,
      created_at: new Date(),
      updated_at: new Date()
    }).onConflict('key').merge();
  }

  console.log('✅ SMTP邮箱配置添加完成');
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔧 开始移除SMTP邮箱配置...');
  
  const smtpKeys = [
    'smtp_enabled',
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
    'smtp_from_name',
    'smtp_from_email',
    'smtp_secure',
    'smtp_provider',
    'email_verification_enabled',
    'verification_code_expire',
    'email_rate_limit'
  ];

  await knex('system_config').whereIn('key', smtpKeys).del();
  
  console.log('✅ SMTP邮箱配置移除完成');
}; 