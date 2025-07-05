const { db } = require('../database/db');
const nodemailer = require('nodemailer');

// 邮箱服务提供商配置
const EMAIL_PROVIDERS = {
  qq: {
    name: 'QQ邮箱',
    host: 'smtp.qq.com',
    port: 587,
    secure: false,
    description: '腾讯QQ邮箱，需要开启SMTP服务并获取授权码'
  },
  '163': {
    name: '163邮箱',
    host: 'smtp.163.com',
    port: 587,
    secure: false,
    description: '网易163邮箱，需要开启SMTP服务并获取授权码'
  },
  '126': {
    name: '126邮箱',
    host: 'smtp.126.com',
    port: 587,
    secure: false,
    description: '网易126邮箱，需要开启SMTP服务并获取授权码'
  },
  gmail: {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    description: 'Google Gmail，需要开启两步验证并生成应用专用密码'
  },
  outlook: {
    name: 'Outlook/Hotmail',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    description: '微软Outlook/Hotmail邮箱'
  },
  sina: {
    name: '新浪邮箱',
    host: 'smtp.sina.com',
    port: 587,
    secure: false,
    description: '新浪邮箱，需要开启SMTP服务'
  },
  sohu: {
    name: '搜狐邮箱',
    host: 'smtp.sohu.com',
    port: 587,
    secure: false,
    description: '搜狐邮箱，需要开启SMTP服务'
  },
  yahoo: {
    name: 'Yahoo邮箱',
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    description: 'Yahoo邮箱，需要开启SMTP服务'
  },
  custom: {
    name: '自定义配置',
    host: '',
    port: 587,
    secure: false,
    description: '自定义SMTP服务器配置'
  }
};

// 获取所有邮箱服务提供商
function getEmailProviders() {
  return EMAIL_PROVIDERS;
}

// 根据提供商获取配置
function getProviderConfig(provider) {
  return EMAIL_PROVIDERS[provider] || EMAIL_PROVIDERS.custom;
}

// 从数据库获取SMTP配置
async function getSmtpConfig() {
  try {
    const configs = await db('system_config')
      .whereIn('key', [
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
      ])
      .select('*');

    const config = {};
    configs.forEach(item => {
      let value = item.value;
      
      // 根据类型转换值
      switch (item.type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = parseInt(value) || 0;
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = {};
          }
          break;
      }
      
      config[item.key] = value;
    });

    return config;
  } catch (error) {
    console.error('获取SMTP配置失败:', error);
    return {};
  }
}

// 保存SMTP配置到数据库
async function saveSmtpConfig(config) {
  try {
    const updates = [];
    
    for (const [key, value] of Object.entries(config)) {
      updates.push({
        key,
        value: String(value),
        updated_at: new Date()
      });
    }

    // 批量更新配置
    for (const update of updates) {
      await db('system_config')
        .where('key', update.key)
        .update(update);
    }

    return true;
  } catch (error) {
    console.error('保存SMTP配置失败:', error);
    return false;
  }
}

// 测试SMTP连接
async function testSmtpConnection(config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      // 设置超时时间
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // 验证连接
    await transporter.verify();
    
    return {
      success: true,
      message: 'SMTP连接测试成功'
    };
  } catch (error) {
    console.error('SMTP连接测试失败:', error);
    return {
      success: false,
      message: `SMTP连接测试失败: ${error.message}`
    };
  }
}

// 发送测试邮件
async function sendTestEmail(config, toEmail) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });

    const mailOptions = {
      from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
      to: toEmail,
      subject: '学习追踪器 - SMTP配置测试邮件',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📚 学习追踪器</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">SMTP配置测试</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">🎉 测试成功！</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              恭喜！您的SMTP邮箱配置已经成功，邮件服务可以正常使用了。
            </p>
            
            <div style="background: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">✅ 配置信息</h3>
              <p style="color: #666; margin: 0;"><strong>SMTP服务器:</strong> ${config.smtp_host}:${config.smtp_port}</p>
              <p style="color: #666; margin: 0;"><strong>发件人:</strong> ${config.smtp_from_name} &lt;${config.smtp_from_email}&gt;</p>
              <p style="color: #666; margin: 0;"><strong>加密方式:</strong> ${config.smtp_secure ? 'SSL/TLS' : 'STARTTLS'}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              现在您可以启用邮箱验证功能，用户注册时将收到验证码邮件。
            </p>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                此邮件由系统自动发送，用于测试SMTP配置。<br>
                发送时间: ${new Date().toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('测试邮件发送成功:', info.messageId);
    
    return {
      success: true,
      message: '测试邮件发送成功',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('发送测试邮件失败:', error);
    return {
      success: false,
      message: `发送测试邮件失败: ${error.message}`
    };
  }
}

// 验证SMTP配置完整性
function validateSmtpConfig(config) {
  const errors = [];
  
  if (!config.smtp_host) {
    errors.push('SMTP服务器地址不能为空');
  }
  
  if (!config.smtp_port || config.smtp_port < 1 || config.smtp_port > 65535) {
    errors.push('SMTP端口必须是1-65535之间的数字');
  }
  
  if (!config.smtp_user) {
    errors.push('SMTP用户名/邮箱不能为空');
  }
  
  if (!config.smtp_pass) {
    errors.push('SMTP密码/授权码不能为空');
  }
  
  if (!config.smtp_from_email) {
    errors.push('发件人邮箱地址不能为空');
  }
  
  if (!config.smtp_from_name) {
    errors.push('发件人显示名称不能为空');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  getEmailProviders,
  getProviderConfig,
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection,
  sendTestEmail,
  validateSmtpConfig
}; 