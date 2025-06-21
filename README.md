# 📚 学习项目完成耗时趋势分析系统

一个现代化的学习项目追踪和分析系统，帮助用户记录学习项目完成时间，分析学习效率趋势，并提供直观的数据可视化。

## ✨ 功能特性

- 🔐 **安全认证系统** - JWT token认证，支持用户注册和登录
- 📊 **数据可视化** - 多种图表展示学习趋势和统计
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌙 **深色模式** - 支持明暗主题切换
- 📤 **Excel导入导出** - 支持Excel文件上传和模板下载
- 📈 **趋势分析** - 雷达图和折线图展示学习效率
- 🔒 **数据安全** - 本地SQLite数据库，数据完全私有

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm 或 yarn

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/yourusername/study-tracker.git
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

4. **启动开发服务器**
```bash
npm start
```

5. **访问应用**
打开浏览器访问 `http://localhost:3001`

## 🛠️ 部署方式

本项目支持三种一键部署方式：

### 1. Vercel 部署（推荐）

**优势：**
- 自动SSL证书
- 全球CDN加速
- 零配置部署
- 免费额度充足

**部署步骤：**
```bash
# 安装Vercel CLI
npm install -g vercel

# 一键部署
./scripts/deploy-vercel.sh
```

### 2. Cloudflare Pages 部署

**优势：**
- 极快的全球访问速度
- 自动DDoS防护
- 免费SSL证书
- 边缘计算支持

**部署步骤：**
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 一键部署
./scripts/deploy-cloudflare.sh
```

### 3. Docker 部署

**优势：**
- 完全控制部署环境
- 支持自定义域名和SSL
- 适合企业级部署
- 数据完全私有

**部署步骤：**
```bash
# 确保已安装Docker和Docker Compose
docker --version
docker-compose --version

# 一键部署
./scripts/deploy-docker.sh
```

## 📁 项目结构

```
study-tracker/
├── assets/                 # 前端资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   └── lib/               # 第三方库
├── database/              # 数据库相关
├── middleware/            # 中间件
├── routes/                # API路由
├── services/              # 服务层
├── scripts/               # 部署脚本
├── excel_templates/       # Excel模板
├── data/                  # 数据存储目录
├── server.js              # 服务器入口
├── package.json           # 项目配置
├── docker-compose.yml     # Docker配置
├── vercel.json           # Vercel配置
├── wrangler.toml         # Cloudflare配置
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