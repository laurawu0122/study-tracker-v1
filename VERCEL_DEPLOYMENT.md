# 🚀 Vercel 部署详细指南

## 📋 部署前准备

### 1. 准备环境变量
在部署前，请准备好以下环境变量：

```bash
# 必需的环境变量
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production

# 可选的环境变量
DEFAULT_ADMIN_PASSWORD=your-custom-admin-password
```

### 2. 生成JWT密钥
```bash
# 在终端中运行以下命令生成JWT密钥
openssl rand -base64 32
```

## 🔧 部署步骤

### 步骤1：访问Vercel
1. 打开 [Vercel官网](https://vercel.com)
2. 使用GitHub、GitLab或Bitbucket账户登录

### 步骤2：导入项目
1. 点击 "New Project"
2. 选择 "Import Git Repository"
3. 搜索并选择 `laurawu0122/study-tracker` 仓库
4. 点击 "Import"

### 步骤3：配置项目
在项目配置页面：

**Framework Preset**: `Node.js`
**Root Directory**: `./` (默认)
**Build Command**: `npm install`
**Output Directory**: `./`
**Install Command**: `npm install`

### 步骤4：设置环境变量
在 "Environment Variables" 部分添加：

| 变量名 | 值 | 说明 |
|--------|----|----|
| `JWT_SECRET` | `your-generated-jwt-secret` | JWT签名密钥（必需） |
| `NODE_ENV` | `production` | 生产环境标识（必需） |
| `DEFAULT_ADMIN_PASSWORD` | `your-custom-password` | 默认管理员密码（可选） |

**示例配置：**
```
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
DEFAULT_ADMIN_PASSWORD=MySecurePassword123!
```

### 步骤5：部署
1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要1-3分钟）

## 🔐 登录系统

### 默认登录凭据

**用户名**: `admin`

**密码**（根据环境变量设置）：
- 如果设置了 `DEFAULT_ADMIN_PASSWORD`：使用该密码
- 如果未设置：使用默认密码 `Admin123!`

### 登录步骤
1. 访问您的Vercel应用URL（例如：`https://your-project.vercel.app`）
2. 点击右上角的 "登录" 按钮
3. 输入用户名和密码
4. 点击 "登录"

### 安全提醒
- 首次登录后请立即修改默认密码
- 建议启用两步验证
- 定期更换JWT密钥

## 🔍 故障排除

### 问题1：部署失败
**可能原因**：
- 环境变量未正确设置
- 依赖包安装失败
- 端口配置问题

**解决方案**：
1. 检查Vercel部署日志
2. 确认所有必需的环境变量已设置
3. 检查 `package.json` 中的依赖

### 问题2：无法登录
**可能原因**：
- 数据库初始化失败
- 密码不正确
- JWT密钥问题

**解决方案**：
1. 检查Vercel函数日志
2. 确认环境变量设置正确
3. 尝试使用默认密码：`Admin123!`

### 问题3：数据丢失
**可能原因**：
- Vercel函数重启
- 数据库文件未持久化

**解决方案**：
- 这是Vercel无服务器环境的限制
- 考虑使用外部数据库服务
- 定期备份重要数据

## 📊 监控和维护

### 查看部署状态
1. 登录Vercel控制台
2. 进入项目页面
3. 查看 "Deployments" 标签

### 查看函数日志
1. 在项目页面点击 "Functions" 标签
2. 查看 `server.js` 函数的日志
3. 监控错误和性能指标

### 环境变量管理
1. 在项目设置中管理环境变量
2. 可以为不同环境设置不同的变量
3. 敏感信息会自动加密

## 🔄 更新部署

### 自动部署
- 每次推送到GitHub主分支会自动触发部署
- 可以设置预览部署用于测试

### 手动部署
1. 在Vercel控制台点击 "Redeploy"
2. 或推送新的代码到GitHub

## 📞 获取帮助

如果遇到问题：

1. **查看Vercel文档**：[vercel.com/docs](https://vercel.com/docs)
2. **检查项目日志**：在Vercel控制台查看详细错误信息
3. **联系支持**：通过Vercel控制台提交支持请求

## 🎯 最佳实践

1. **环境变量管理**
   - 使用强密码和密钥
   - 定期轮换敏感信息
   - 为不同环境设置不同配置

2. **安全配置**
   - 启用HTTPS（Vercel自动提供）
   - 设置适当的CORS策略
   - 定期更新依赖包

3. **性能优化**
   - 监控函数执行时间
   - 优化数据库查询
   - 使用CDN缓存静态资源

---

通过以上步骤，您应该能够成功部署项目到Vercel并正常使用所有功能！ 