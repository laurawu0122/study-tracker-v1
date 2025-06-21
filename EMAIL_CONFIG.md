# 邮箱验证码配置说明

## 功能说明

系统已添加邮箱验证码功能，用户在注册时需要：
1. 输入邮箱地址
2. 点击"发送验证码"按钮
3. 在邮箱中查看6位数字验证码
4. 输入验证码完成注册

## 邮件服务器配置

要启用邮箱验证码功能，需要配置邮件服务器。请在项目根目录创建 `.env` 文件，并添加以下配置：

```env
# ========================================
# 学习项目追踪系统 - 环境配置文件
# ========================================

# 服务器配置
PORT=3001
NODE_ENV=development

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# 数据库配置
DB_PATH=./database/study_tracker.db

# ========================================
# 邮件服务器配置 (必需)
# ========================================

# 邮件服务器地址
SMTP_HOST=smtp.qq.com

# 邮件服务器端口
SMTP_PORT=587

# 邮箱账号 (发件人邮箱)
SMTP_USER=your-email@qq.com

# 邮箱密码或应用专用密码
SMTP_PASS=your-app-password

# 发件人显示名称
SMTP_FROM_NAME=学习项目追踪系统

# 发件人邮箱地址 (通常与SMTP_USER相同)
SMTP_FROM_EMAIL=your-email@qq.com

# 邮件安全设置
SMTP_SECURE=false

# ========================================
# 系统功能配置
# ========================================

# 是否启用用户注册功能
REGISTRATION_ENABLED=true

# 验证码有效期 (分钟)
VERIFICATION_CODE_EXPIRE=10

# 验证码长度
VERIFICATION_CODE_LENGTH=6

# 邮件发送频率限制 (秒)
EMAIL_RATE_LIMIT=60

# ========================================
# 安全配置
# ========================================

# 密码加密轮数
BCRYPT_ROUNDS=12

# 会话超时时间 (小时)
SESSION_TIMEOUT=24

# ========================================
# 日志配置
# ========================================

# 日志级别
LOG_LEVEL=info

# 是否启用详细日志
DEBUG=false
```

## 常用邮箱配置

### QQ邮箱
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-qq-email@qq.com
SMTP_PASS=your-qq-app-password
SMTP_FROM_NAME=学习项目追踪系统
SMTP_FROM_EMAIL=your-qq-email@qq.com
SMTP_SECURE=false
```

### 163邮箱
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=587
SMTP_USER=your-163-email@163.com
SMTP_PASS=your-163-app-password
SMTP_FROM_NAME=学习项目追踪系统
SMTP_FROM_EMAIL=your-163-email@163.com
SMTP_SECURE=false
```

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM_NAME=学习项目追踪系统
SMTP_FROM_EMAIL=your-gmail@gmail.com
SMTP_SECURE=false
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-outlook@outlook.com
SMTP_PASS=your-outlook-password
SMTP_FROM_NAME=学习项目追踪系统
SMTP_FROM_EMAIL=your-outlook@outlook.com
SMTP_SECURE=false
```

## 获取邮箱授权码

### QQ邮箱
1. 登录QQ邮箱网页版
2. 点击"设置" → "账户"
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"POP3/SMTP服务"
5. 按照提示获取授权码（这就是SMTP_PASS）

### 163邮箱
1. 登录163邮箱网页版
2. 点击"设置" → "POP3/SMTP/IMAP"
3. 开启"POP3/SMTP服务"
4. 获取授权码（这就是SMTP_PASS）

### Gmail
1. 登录Google账户
2. 开启两步验证
3. 生成应用专用密码
4. 使用应用专用密码作为SMTP_PASS

## 验证码功能特性

- ✅ **6位数字验证码**: 随机生成，易于输入
- ✅ **10分钟有效期**: 防止验证码长期有效
- ✅ **一次性使用**: 验证后立即失效
- ✅ **防重复发送**: 60秒倒计时限制
- ✅ **邮箱唯一性**: 同一邮箱只能注册一个账户
- ✅ **美观邮件模板**: 专业的HTML邮件格式

## 安全特性

- 🔒 **防止垃圾注册**: 必须验证真实邮箱
- 🔒 **验证码过期**: 10分钟后自动失效
- 🔒 **防重复使用**: 每个验证码只能使用一次
- 🔒 **频率限制**: 防止恶意发送验证码
- 🔒 **邮箱验证**: 确保邮箱地址有效

## 故障排除

### 邮件发送失败
1. 检查SMTP配置是否正确
2. 确认邮箱授权码是否有效
3. 检查网络连接
4. 查看服务器控制台错误信息

### 验证码不匹配
1. 确认输入的是最新发送的验证码
2. 检查验证码是否已过期（10分钟）
3. 确认邮箱地址输入正确

### 注册功能不可用
1. 检查管理员是否关闭了注册功能
2. 确认邮件服务器配置正确
3. 查看服务器日志

## 开发模式

如果暂时不想配置邮件服务器，系统会显示"邮件服务暂时不可用"的提示，但其他功能仍然正常。 

## 配置步骤

1. **创建 .env 文件**
   ```bash
   touch .env
   ```

2. **编辑 .env 文件**
   将上面的配置模板复制到 `.env` 文件中，并替换相应的值

3. **重启服务器**
   ```bash
   npm start
   ```

4. **验证配置**
   服务器启动后应该看到：
   ```
   数据库连接成功
   数据库初始化完成
   服务器运行在 http://localhost:3001
   环境: development
   📧 邮件服务已配置，邮箱验证功能可用。
   ```

## 注意事项

1. **安全性**：不要将 `.env` 文件提交到版本控制系统
2. **密码**：使用应用专用密码，不要使用邮箱登录密码
3. **端口**：确保防火墙允许SMTP端口（通常是587或465）
4. **测试**：配置完成后，可以尝试注册新用户来测试邮件功能

## 故障排除

### 常见错误
- **535 Authentication failed**：检查用户名和密码是否正确
- **Connection timeout**：检查SMTP_HOST和SMTP_PORT是否正确
- **SSL/TLS错误**：尝试设置SMTP_SECURE=true

### 调试模式
设置 `DEBUG=true` 可以查看详细的邮件发送日志。 