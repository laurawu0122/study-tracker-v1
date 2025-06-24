# 📚 学习项目完成耗时趋势分析系统


一个现代化的学习项目追踪和分析系统，帮助用户记录学习项目完成时间，分析学习效率趋势，并提供直观的数据可视化。

## ✨ 功能特性

- 🔐 **安全认证系统** - JWT token认证，支持用户注册和登录
- 📊 **数据可视化** - 多种图表展示学习趋势和统计
- 📱 **响应式设计** - 完美适配桌面和移动设备，移动端优化体验
- 🌙 **深色模式** - 支持明暗主题切换
- 📤 **Excel导入导出** - 支持Excel文件上传和模板下载
- 📈 **趋势分析** - 雷达图和折线图展示学习效率
- 🔒 **数据安全** - 本地SQLite数据库，数据完全私有
- 🚀 **一键部署** - 支持Vercel和Docker部署，简单快捷

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm 或 yarn

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/laurawu0122/study-tracker.git
cd study-tracker
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，填写必要的配置
```

**🔐 JWT_SECRET 配置：**
```bash
# 自动生成JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env

# 或者手动编辑.env文件，将JWT_SECRET替换为生成的随机字符串
```

4. **启动开发服务器**
```bash
npm start
```

5. **访问应用**
打开浏览器访问 `http://localhost:3001`

## 🛠️ 部署方式

本项目支持两种部署方式，点击上方徽章即可一键部署：

### 1. Vercel 部署（推荐）
[![Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flaurawu0122%2Fstudy-tracker)

**优势：**
- 自动SSL证书
- 全球CDN加速
- 零配置部署
- 免费额度充足
- 数据持久化稳定

**📖 详细部署指南：** 查看 [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) 获取完整的部署步骤和故障排除指南。

**部署步骤：**

1. **点击部署按钮**：点击上方的 [![Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flaurawu0122%2Fstudy-tracker) 按钮

2. **授权GitHub**：登录Vercel并授权访问GitHub

3. **配置项目**：
   - 项目名称：`study-tracker`（或自定义）
   - Framework Preset：选择 `Other` ⭐ **重要：选择Other，不是Node.js**
   - Root Directory：`./`（默认）
   - Build Command：留空（Vercel会自动检测）
   - Output Directory：留空（Vercel会自动检测）

4. **环境变量配置**：
   在Vercel控制台的 `Settings` → `Environment Variables` 中添加：
   ```
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=production
   DEFAULT_ADMIN_PASSWORD=your-custom-admin-password
   ```
   
   **🔐 JWT_SECRET 获取方式：**
   - **自动生成**：在终端运行 `openssl rand -base64 32` 生成随机字符串
   - **手动设置**：使用至少32位的随机字符串，包含字母、数字和特殊字符
   - **安全提醒**：不要使用默认值，生产环境必须使用强随机字符串
   
   **🔑 DEFAULT_ADMIN_PASSWORD（可选）：**
   - 设置默认管理员密码，避免每次部署都重新生成
   - 如果不设置，系统会使用默认密码：`Admin123!`
   - 建议设置一个强密码，登录后立即修改

5. **部署**：点击 `Deploy` 按钮

6. **访问应用**：部署完成后会获得一个 `https://your-project.vercel.app` 的链接

7. **登录系统**：
   - **用户名**: `admin`
   - **密码**: 
     - 如果设置了 `DEFAULT_ADMIN_PASSWORD` 环境变量，使用该密码
     - 否则使用默认密码：`Admin123!`
   - **重要**: 首次登录后请立即修改默认密码

**⚠️ 重要提示：**
- 选择 `Other` 作为Framework Preset，Vercel会自动检测这是一个Node.js项目
- 项目根目录的 `vercel.json` 文件已经配置好了部署设置
- 如果部署失败，请检查环境变量是否正确设置
- 更多详细信息和故障排除，请查看 [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

### 2. Docker 部署

**优势：**
- 完全控制部署环境
- 支持自定义域名和SSL
- 数据完全私有
- 数据持久化稳定

**部署步骤：**

1. **克隆项目**
```bash
git clone https://github.com/laurawu0122/study-tracker.git
cd study-tracker
```

2. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，填写必要的配置
```

3. **生成SSL证书**（可选）
```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

4. **启动服务**
```bash
docker-compose up -d
```

5. **访问应用**
- HTTP: `http://localhost`
- HTTPS: `https://localhost`（如果配置了SSL）

**⚠️ 关于Cloudflare Pages部署**

由于Cloudflare Pages是无服务器环境，存在以下限制：
- 每次请求都会重新初始化数据库
- 用户数据无法持久化
- 默认密码会重新生成
- 登录功能不稳定

因此我们暂时不支持Cloudflare Pages部署方式。如需使用Cloudflare服务，建议：
1. 使用Cloudflare D1数据库（需要额外配置）
2. 或选择Vercel部署（推荐）
3. 或使用Docker自建服务器

## 📁 项目结构

```
study-tracker/
├── assets/                 # 前端资源
│   ├── css/               # 样式文件
│   │   ├── main.css       # 主样式
│   │   ├── editor.css     # 编辑器样式
│   │   └── mobile-optimized.css # 移动端优化样式
│   ├── js/                # JavaScript文件
│   │   ├── main.js        # 主逻辑
│   │   ├── editor.js      # 编辑器逻辑
│   │   └── mobile-optimized.js # 移动端优化脚本
│   └── lib/               # 第三方库
├── database/              # 数据库相关
│   └── db.js              # 数据库配置
├── middleware/            # 中间件
├── routes/                # API路由
├── services/              # 服务层
├── scripts/               # 部署脚本
│   ├── deploy-vercel.sh   # Vercel部署脚本
│   └── deploy-docker.sh   # Docker部署脚本
├── excel_templates/       # Excel模板
├── data/                  # 数据存储目录
├── server.js              # 服务器入口
├── package.json           # 项目配置
├── docker-compose.yml     # Docker配置
├── vercel.json           # Vercel配置
├── cloudflare-d1-setup.md # Cloudflare D1设置指南
├── MOBILE_OPTIMIZATION.md # 移动端优化说明
└── README.md             # 项目说明
```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件并配置以下变量：

```env
# 应用配置
NODE_ENV=production
PORT=3001

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here

# 邮件配置（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-app-password

# 安全配置
TRUST_PROXY=true
```

#### 🔐 JWT_SECRET 获取方式

**方法一：自动生成（推荐）**
```bash
# 使用OpenSSL生成32位随机字符串
openssl rand -base64 32
```

**方法二：手动设置**
- 使用至少32位的随机字符串
- 可以包含字母、数字和特殊字符
- 示例：`my-super-secret-jwt-key-2024-xyz123!@#`

**安全建议：**
- 生产环境必须使用强随机字符串
- 不要使用默认值或简单字符串
- 定期更换JWT_SECRET
- 妥善保管，不要泄露给他人

### 安全配置

1. **JWT密钥**：使用强随机字符串
2. **邮件配置**：使用应用专用密码
3. **HTTPS**：生产环境必须启用
4. **防火墙**：限制端口访问

## 📊 数据格式

### Excel文件格式

系统支持导入Excel文件，格式要求：

| 列名 | 类型 | 说明 |
|------|------|------|
| 项目名称 | 文本 | 学习项目名称 |
| 开始时间 | 日期 | 项目开始时间 |
| 完成时间 | 日期 | 项目完成时间 |
| 耗时(小时) | 数字 | 实际耗时 |
| 难度等级 | 数字 | 1-5级难度 |
| 备注 | 文本 | 可选备注信息 |

### 下载模板

访问 `/excel_templates/学习项目记录示例.xlsx` 下载标准模板。

## 🔒 安全特性

- **JWT认证**：安全的token认证机制
- **密码加密**：bcrypt密码哈希
- **SQL注入防护**：参数化查询
- **XSS防护**：输入验证和输出编码
- **CSRF防护**：SameSite Cookie
- **速率限制**：防止暴力攻击
- **文件上传安全**：类型和大小限制

## 🐛 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3001
# 终止进程
kill -9 <PID>
```

2. **数据库连接失败**
```bash
# 检查数据库文件权限
ls -la data/
# 重新初始化数据库
rm data/study_tracker.db
npm start
```

3. **邮件发送失败**
- 检查SMTP配置
- 确认邮箱授权码正确
- 检查网络连接

### 日志查看

```bash
# 查看应用日志
npm start 2>&1 | tee app.log

# Docker环境查看日志
docker-compose logs -f
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Chart.js](https://www.chartjs.org/) - 图表库
- [Moment.js](https://momentjs.com/) - 日期处理
- [SheetJS](https://sheetjs.com/) - Excel处理
- [Express.js](https://expressjs.com/) - Web框架

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [常见问题](#故障排除)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
