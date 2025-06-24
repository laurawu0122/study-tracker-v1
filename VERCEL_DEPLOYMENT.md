# 🚀 Vercel 部署详细指南

本指南将帮助您将学习项目完成耗时趋势分析系统部署到Vercel平台。

## 📋 部署前准备

1. **GitHub账户**：确保您的代码已推送到GitHub
2. **Vercel账户**：注册 [Vercel](https://vercel.com) 账户
3. **环境变量**：准备好JWT_SECRET等配置

## 🔧 详细部署步骤

### 第一步：访问Vercel

1. 打开 [Vercel](https://vercel.com)
2. 点击 "New Project" 或 "Add New..."
3. 选择 "Import Git Repository"

### 第二步：连接GitHub

1. 点击 "Continue with GitHub"
2. 授权Vercel访问您的GitHub账户
3. 搜索并选择您的项目仓库：`laurawu0122/study-tracker`

### 第三步：项目配置

在项目配置页面，按以下设置：

**基本配置：**
- **Project Name**: `study-tracker` (或自定义名称)
- **Framework Preset**: `Other` ⭐ **重要：选择Other，不是Node.js**
- **Root Directory**: `./` (默认)
- **Build Command**: 留空 (Vercel会自动检测)
- **Output Directory**: 留空 (Vercel会自动检测)

**⚠️ 项目名称冲突处理：**
如果遇到 "Project 'study-tracker' already exists" 错误：
1. **使用不同的项目名称**，例如：
   - `study-tracker-2024`
   - `learning-tracker`
   - `my-study-tracker`
   - `study-tracker-v2`
   - 或者使用您的GitHub用户名作为前缀：`laurawu0122-study-tracker`

2. **或者删除现有项目**：
   - 在Vercel控制台找到现有的 `study-tracker` 项目
   - 进入项目设置 → General → Delete Project
   - 确认删除后重新部署

**为什么选择Other？**
- Vercel的Framework Preset中没有Node.js选项
- 选择Other后，Vercel会根据项目结构和配置文件自动识别为Node.js项目
- 项目根目录的 `vercel.json` 文件会告诉Vercel如何处理这个项目

### 第四步：环境变量配置

**重要：在部署前必须配置环境变量！**

点击 "Environment Variables" 部分，添加以下变量：

#### 必需环境变量：

1. **JWT_SECRET**
   ```
   Name: JWT_SECRET
   Value: your-super-secret-jwt-key-here
   Environment: Production, Preview, Development
   ```
   
   **获取JWT_SECRET的方法：**
   ```bash
   # 方法1：使用OpenSSL生成（推荐）
   openssl rand -base64 32
   
   # 方法2：使用Node.js生成
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **NODE_ENV**
   ```
   Name: NODE_ENV
   Value: production
   Environment: Production, Preview, Development
   ```

#### 可选环境变量：

3. **DEFAULT_ADMIN_PASSWORD**
   ```
   Name: DEFAULT_ADMIN_PASSWORD
   Value: your-custom-admin-password
   Environment: Production, Preview, Development
   ```
   
   **说明：**
   - 如果不设置，系统使用默认密码：`Admin123!`
   - 建议设置一个强密码，登录后立即修改

### 第五步：部署

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要1-3分钟）
3. 部署成功后会显示项目URL

### 第六步：验证部署

1. **访问应用**：点击项目URL或复制到浏览器
2. **测试登录**：
   - 用户名：`admin`
   - 密码：您设置的 `DEFAULT_ADMIN_PASSWORD` 或默认的 `Admin123!`
3. **修改密码**：首次登录后立即修改默认密码

## 🔍 部署配置说明

### vercel.json 文件解析

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",        // 入口文件
      "use": "@vercel/node",     // 使用Node.js运行时
      "config": {
        "maxDuration": 30        // 函数超时时间（秒）
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",        // API路由
      "dest": "/server.js"       // 转发到server.js
    },
    {
      "src": "/(.*)",            // 静态文件路由
      "dest": "/$1"              // 直接提供静态文件
    }
  ],
  "env": {
    "NODE_ENV": "production"     // 默认环境变量
  }
}
```

## 🐛 常见问题解决

### 1. 项目名称冲突

**错误信息：** "Project 'study-tracker' already exists, please use a new name"

**解决方案：**
1. **使用新的项目名称**：
   - `study-tracker-2024`
   - `learning-tracker`
   - `my-study-tracker`
   - `study-tracker-v2`
   - `laurawu0122-study-tracker`

2. **删除现有项目**：
   - 登录Vercel控制台
   - 找到现有的 `study-tracker` 项目
   - 进入 Settings → General → Delete Project
   - 确认删除后重新部署

### 2. 部署失败

**错误信息：** "Build failed" 或 "Function execution failed"

**解决方案：**
1. 检查环境变量是否正确设置
2. 确保JWT_SECRET不为空
3. 查看Vercel部署日志获取详细错误信息

### 3. 500内部服务器错误

**错误信息：** "500: INTERNAL_SERVER_ERROR" 或 "FUNCTION_INVOCATION_FAILED"

**诊断步骤：**

1. **检查Vercel函数日志**：
   - 在Vercel控制台进入项目
   - 点击 "Functions" 标签
   - 查看 `server.js` 函数的详细日志
   - 寻找具体的错误信息

2. **测试简化版本**：
   - 临时将 `vercel.json` 中的 `src` 改为 `vercel-test.js`
   - 重新部署测试基本功能
   - 如果测试文件工作正常，说明问题在主应用代码中

3. **检查环境变量**：
   - 确认 `JWT_SECRET` 已设置且不为空
   - 确认 `NODE_ENV=production` 已设置
   - 检查其他必需的环境变量

4. **检查依赖包**：
   - 确认 `package.json` 中的所有依赖都已安装
   - 检查是否有版本冲突

**常见原因和解决方案：**

**原因1：数据库初始化失败**
- Vercel环境使用临时数据库，每次请求都会重新初始化
- 确保数据库路径使用临时目录
- 检查数据库权限问题

**原因2：文件系统权限问题**
- Vercel文件系统是只读的
- 避免在代码中写入文件
- 使用环境变量存储配置

**原因3：环境变量缺失**
- 确保设置了所有必需的环境变量
- 检查环境变量名称是否正确
- 确认环境变量值不为空

**原因4：依赖包问题**
- 某些原生依赖包在Vercel环境中可能不兼容
- 检查 `sqlite3` 等包的兼容性
- 考虑使用纯JavaScript替代方案

**解决方案：**
1. 查看Vercel函数日志获取具体错误信息
2. 检查并修复代码中的文件写入操作
3. 确保所有环境变量正确设置
4. 重新部署项目

### 4. 无法访问应用

**错误信息：** "404 Not Found" 或 "Function not found" 或 "404: NOT_FOUND"

**诊断步骤：**

1. **测试调试端点**：
   - 访问 `https://your-project.vercel.app/debug`
   - 如果返回JSON数据，说明服务器正常运行
   - 如果返回404，说明路由配置有问题

2. **测试健康检查**：
   - 访问 `https://your-project.vercel.app/health`
   - 检查服务器状态和数据库连接

3. **检查静态文件**：
   - 访问 `https://your-project.vercel.app/assets/css/main.css`
   - 确认静态文件是否能正常访问

4. **检查环境变量**：
   - 在Vercel控制台确认所有环境变量已正确设置
   - 特别是 `JWT_SECRET` 和 `NODE_ENV`

**常见原因和解决方案：**

**原因1：路由配置错误**
- 检查 `vercel.json` 中的路由配置
- 确保所有路径都正确指向 `server.js`

**原因2：环境变量缺失**
- 确保设置了 `JWT_SECRET` 环境变量
- 确保设置了 `NODE_ENV=production`

**原因3：文件路径问题**
- 确认 `index.html` 在项目根目录
- 确认所有静态文件路径正确

**原因4：构建失败**
- 检查Vercel部署日志
- 确认所有依赖包正确安装

**解决方案：**
1. 确认 `vercel.json` 文件存在且配置正确
2. 检查项目根目录是否有 `server.js` 文件
3. 重新部署项目

### 5. vercel.json 配置错误

**错误信息：** "The `functions` property cannot be used in conjunction with the `builds` property"

**解决方案：**
1. 确保 `vercel.json` 使用正确的格式
2. 不要同时使用 `builds` 和 `functions` 属性
3. 将函数配置放在 `builds` 的 `config` 中

**正确的配置格式：**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 30
      }
    }
  ],
  "routes": [...],
  "env": {...}
}
```

### 6. 登录失败

**错误信息：** "Invalid credentials"

**解决方案：**
1. 确认使用了正确的用户名：`admin`
2. 检查 `DEFAULT_ADMIN_PASSWORD` 环境变量是否正确设置
3. 如果没有设置环境变量，使用默认密码：`Admin123!`

### 7. 数据库问题

**错误信息：** "Database connection failed"

**解决方案：**
1. Vercel使用无服务器环境，每次请求都会重新初始化
2. 这是正常行为，数据会在请求期间保持
3. 如果需要持久化数据，考虑使用外部数据库服务

## 🔧 高级配置

### 自定义域名

1. 在Vercel控制台点击项目
2. 进入 "Settings" → "Domains"
3. 添加您的自定义域名
4. 配置DNS记录

### 环境变量管理

**生产环境变量：**
- 只在生产环境生效
- 用于正式部署

**预览环境变量：**
- 在Pull Request预览中生效
- 用于测试新功能

**开发环境变量：**
- 在本地开发时生效
- 用于本地测试

### 自动部署

**GitHub集成：**
- 每次推送到main分支自动部署
- Pull Request创建预览环境
- 支持回滚到之前的版本

## 📊 监控和维护

### 查看日志

1. 在Vercel控制台点击项目
2. 进入 "Functions" 标签
3. 查看函数执行日志

### 性能监控

1. 在Vercel控制台查看 "Analytics"
2. 监控请求数量、响应时间
3. 查看错误率和用户分布

### 更新部署

1. 推送代码到GitHub
2. Vercel自动触发新部署
3. 或手动在Vercel控制台触发部署

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**：Vercel控制台 → Functions → 查看详细日志
2. **检查配置**：确认 `vercel.json` 和环境变量设置
3. **社区支持**：访问 [Vercel社区](https://github.com/vercel/vercel/discussions)
4. **官方文档**：查看 [Vercel文档](https://vercel.com/docs)

---

🎉 **恭喜！** 您的学习项目完成耗时趋势分析系统已成功部署到Vercel！

现在您可以通过 `https://your-project.vercel.app` 访问您的应用了。 