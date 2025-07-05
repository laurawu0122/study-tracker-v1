// SMTP邮箱配置相关函数

// 邮箱服务提供商配置
const emailProviders = {
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

// 初始化SMTP配置页面
function initSmtpConfig() {
  console.log('初始化SMTP邮箱配置...');
  loadSmtpConfig();
  setupSmtpEventListeners();
}

// 设置事件监听器
function setupSmtpEventListeners() {
  // 邮箱服务商选择
  const providerSelect = document.getElementById('smtpProvider');
  if (providerSelect) {
    providerSelect.addEventListener('change', function() {
      const provider = this.value;
      const config = emailProviders[provider];
      
      if (config) {
        document.getElementById('smtpHost').value = config.host;
        document.getElementById('smtpPort').value = config.port;
        document.getElementById('smtpSecure').value = config.secure.toString();
        document.getElementById('providerDescription').textContent = config.description;
      }
    });
  }

  // 测试连接
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testSmtpConnection);
  }

  // 保存配置
  const saveConfigBtn = document.getElementById('saveSmtpConfigBtn');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', saveSmtpConfig);
  }
}

// 加载SMTP配置
async function loadSmtpConfig() {
  try {
    const response = await fetch('/api/admin/smtp-config', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderSmtpConfig(data.config);
    } else {
      showSmtpStatus('加载SMTP配置失败: ' + data.error, 'error');
    }
  } catch (error) {
    showSmtpStatus('加载SMTP配置失败: ' + error.message, 'error');
  }
}

// 渲染SMTP配置
function renderSmtpConfig(config) {
  const elements = {
    smtpEnabled: document.getElementById('smtpEnabled'),
    emailVerificationEnabled: document.getElementById('emailVerificationEnabled'),
    smtpProvider: document.getElementById('smtpProvider'),
    smtpSecure: document.getElementById('smtpSecure'),
    smtpHost: document.getElementById('smtpHost'),
    smtpPort: document.getElementById('smtpPort'),
    smtpUser: document.getElementById('smtpUser'),
    smtpPass: document.getElementById('smtpPass'),
    smtpFromName: document.getElementById('smtpFromName'),
    smtpFromEmail: document.getElementById('smtpFromEmail'),
    verificationCodeExpire: document.getElementById('verificationCodeExpire'),
    emailRateLimit: document.getElementById('emailRateLimit')
  };

  if (elements.smtpEnabled) elements.smtpEnabled.checked = config.smtp_enabled || false;
  if (elements.emailVerificationEnabled) elements.emailVerificationEnabled.checked = config.email_verification_enabled !== false;
  if (elements.smtpProvider) elements.smtpProvider.value = config.smtp_provider || 'custom';
  if (elements.smtpSecure) elements.smtpSecure.value = (config.smtp_secure || false).toString();
  if (elements.smtpHost) elements.smtpHost.value = config.smtp_host || '';
  if (elements.smtpPort) elements.smtpPort.value = config.smtp_port || 587;
  if (elements.smtpUser) elements.smtpUser.value = config.smtp_user || '';
  if (elements.smtpPass) elements.smtpPass.value = config.smtp_pass || '';
  if (elements.smtpFromName) elements.smtpFromName.value = config.smtp_from_name || '学习项目追踪系统';
  if (elements.smtpFromEmail) elements.smtpFromEmail.value = config.smtp_from_email || '';
  if (elements.verificationCodeExpire) elements.verificationCodeExpire.value = config.verification_code_expire || 10;
  if (elements.emailRateLimit) elements.emailRateLimit.value = config.email_rate_limit || 60;
  
  // 触发提供商选择事件
  if (elements.smtpProvider) {
    elements.smtpProvider.dispatchEvent(new Event('change'));
  }
}

// 保存SMTP配置
async function saveSmtpConfig() {
  try {
    const config = {
      smtp_enabled: document.getElementById('smtpEnabled')?.checked || false,
      email_verification_enabled: document.getElementById('emailVerificationEnabled')?.checked !== false,
      smtp_provider: document.getElementById('smtpProvider')?.value || 'custom',
      smtp_secure: document.getElementById('smtpSecure')?.value === 'true',
      smtp_host: document.getElementById('smtpHost')?.value || '',
      smtp_port: parseInt(document.getElementById('smtpPort')?.value) || 587,
      smtp_user: document.getElementById('smtpUser')?.value || '',
      smtp_pass: document.getElementById('smtpPass')?.value || '',
      smtp_from_name: document.getElementById('smtpFromName')?.value || '学习项目追踪系统',
      smtp_from_email: document.getElementById('smtpFromEmail')?.value || '',
      verification_code_expire: parseInt(document.getElementById('verificationCodeExpire')?.value) || 10,
      email_rate_limit: parseInt(document.getElementById('emailRateLimit')?.value) || 60
    };
    
    const response = await fetch('/api/admin/smtp-config', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSmtpStatus('SMTP配置保存成功', 'success');
    } else {
      showSmtpStatus('SMTP配置保存失败: ' + data.error, 'error');
    }
  } catch (error) {
    showSmtpStatus('SMTP配置保存失败: ' + error.message, 'error');
  }
}

// 测试SMTP连接
async function testSmtpConnection() {
  try {
    const config = {
      smtp_host: document.getElementById('smtpHost')?.value || '',
      smtp_port: parseInt(document.getElementById('smtpPort')?.value) || 587,
      smtp_user: document.getElementById('smtpUser')?.value || '',
      smtp_pass: document.getElementById('smtpPass')?.value || '',
      smtp_secure: document.getElementById('smtpSecure')?.value === 'true'
    };
    
    const response = await fetch('/api/admin/smtp-config/test-connection', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSmtpStatus('SMTP连接测试成功', 'success');
    } else {
      showSmtpStatus('SMTP连接测试失败: ' + data.error, 'error');
    }
  } catch (error) {
    showSmtpStatus('SMTP连接测试失败: ' + error.message, 'error');
  }
}

// 显示弹窗通知
function showSmtpStatus(message, type) {
  console.log('showSmtpStatus被调用:', message, type);
  
  // 创建弹窗元素
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  modalOverlay.id = 'smtpModalOverlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0';
  modalContent.id = 'smtpModalContent';
  
  // 设置图标和标题
  let icon, title;
  if (type === 'success') {
    icon = '✅';
    title = '操作成功';
  } else if (type === 'error') {
    icon = '❌';
    title = '操作失败';
  } else {
    icon = 'ℹ️';
    title = '提示信息';
  }
  
  modalContent.innerHTML = `
    <div class="p-6">
      <div class="flex items-center mb-4">
        <div class="text-2xl mr-3">${icon}</div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h3>
      </div>
      <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
      <div class="flex justify-end">
        <button id="smtpModalCloseBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
          确定
        </button>
      </div>
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // 添加动画效果
  setTimeout(() => {
    modalContent.style.transform = 'scale(1)';
    modalContent.style.opacity = '1';
  }, 10);
  
  // 添加关闭事件
  const closeBtn = document.getElementById('smtpModalCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideSmtpModal();
    });
  }
  
  // 点击遮罩关闭
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      hideSmtpModal();
    }
  });
}

// 隐藏弹窗
function hideSmtpModal() {
  const modalOverlay = document.getElementById('smtpModalOverlay');
  const modalContent = document.getElementById('smtpModalContent');
  
  if (!modalOverlay || !modalContent) {
    return;
  }
  
  // 添加关闭动画
  modalContent.style.transform = 'scale(0.95)';
  modalContent.style.opacity = '0';
  
  setTimeout(() => {
    if (modalOverlay.parentElement) {
      modalOverlay.remove();
    }
  }, 300);
}

// 导出函数
window.smtpConfig = {
  init: initSmtpConfig,
  load: loadSmtpConfig,
  save: saveSmtpConfig,
  test: testSmtpConnection
};

// 自动初始化（如果页面包含SMTP配置元素）
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，检查SMTP配置页面...');
  
  // 检查是否在SMTP配置页面
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const saveSmtpConfigBtn = document.getElementById('saveSmtpConfigBtn');
  
  if (testConnectionBtn && saveSmtpConfigBtn) {
    console.log('检测到SMTP配置页面，开始初始化...');
    initSmtpConfig();
    
    // 测试弹窗功能
    setTimeout(() => {
      console.log('测试弹窗功能...');
      showSmtpStatus('这是一个测试弹窗，用于验证弹窗功能是否正常工作', 'info');
    }, 1000);
  }
}); 