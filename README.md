# 📚 Study Tracker - 现代化学习追踪系统

一个基于 Node.js + Express + PostgreSQL 构建的现代化学习追踪系统，采用 Ghost 风格的架构设计，提供完整的学习项目管理、时间追踪、成就系统和积分兑换功能。

![Node.js](https://img.shields.io/badge/Node.js-18.18.2-green)
![Express](https://img.shields.io/badge/Express-4.18.2-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.16.2-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.0-38B2AC)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能特性

### 🎯 核心功能
- **学习项目管理** - 创建、编辑、分类学习项目
- **时间追踪** - 记录学习时长，生成详细的学习记录
- **数据可视化** - 直观的图表展示学习进度和统计
- **成就系统** - 丰富的成就徽章和激励机制
- **积分系统** - 学习获得积分，支持积分兑换
- **通知系统** - 实时通知和学习提醒

### 🔐 用户系统
- **用户认证** - JWT 认证，支持登录/注册
- **权限管理** - 用户和管理员角色分离
- **密码安全** - bcrypt 加密，支持密码重置
- **邮箱验证** - SMTP 邮件验证功能

### 📊 管理功能
- **用户管理** - 管理员可管理所有用户
- **数据管理** - 支持数据导入导出
- **系统配置** - 灵活的配置管理
- **操作日志** - 完整的操作审计

### 🎨 界面特性
- **响应式设计** - 完美适配桌面和移动端
- **深色模式** - 支持明暗主题切换
- **现代化UI** - 基于 Tailwind CSS 的美观界面
- **实时交互** - HTMX 驱动的无刷新体验

## 🛠️ 技术栈

### 后端
- **Node.js** - JavaScript 运行时
- **Express.js** - Web 应用框架
- **PostgreSQL** - 关系型数据库
- **Knex.js** - SQL 查询构建器
- **JWT** - 身份认证
- **bcrypt** - 密码加密
- **Nodemailer** - 邮件发送

### 前端
- **Handlebars** - 模板引擎
- **Tailwind CSS** - 实用优先的 CSS 框架
- **HTMX** - 现代 JavaScript 库
- **Alpine.js** - 轻量级响应式框架
- **Chart.js** - 数据可视化

### 开发工具
- **PostCSS** - CSS 处理工具
- **PurgeCSS** - 未使用 CSS 清理
- **Webpack** - 模块打包工具
- **ESLint** - 代码质量检查

## 📦 安装部署

### 环境要求
- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm >= 8.0.0

### 🐳 Docker 一键部署（推荐）

#### 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

#### 快速部署

1. **克隆项目**
```bash
git clone https://github.com/your-username/study-tracker.git
cd study-tracker
```

2. **配置环境变量**
```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件，设置数据库密码、JWT密钥等
nano .env
```

3. **一键部署**
```bash
# 给脚本执行权限
chmod +x scripts/docker-deploy.sh scripts/docker-manage.sh

# 生产环境部署
./scripts/docker-deploy.sh prod

# 或开发环境部署
./scripts/docker-deploy.sh dev
```

4. **访问应用**
- 应用地址：http://localhost:3001
- 默认管理员账号：admin
- 默认密码：Admin123!（可在 .env 中修改）

#### Docker 管理命令
```bash
# 查看服务状态
./scripts/docker-manage.sh status

# 查看应用日志
./scripts/docker-manage.sh logs

# 备份数据库
./scripts/docker-manage.sh backup

# 重启服务
./scripts/docker-manage.sh restart

# 停止服务
./scripts/docker-manage.sh stop
```

#### 使用 npm 脚本
```bash
# 部署生产环境
npm run deploy:prod

# 部署开发环境
npm run deploy:dev

# 查看日志
npm run docker:logs

# 重启服务
npm run docker:restart
```

### 🔧 传统安装方式

1. **克隆项目**
```bash
git clone https://github.com/your-username/study-tracker.git
cd study-tracker
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件
nano .env
```

4. **配置数据库**
```bash
# 设置数据库
npm run db:setup

# 或手动运行迁移和种子
npm run db:migrate
npm run db:seed
```

5. **启动项目**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

6. **访问应用**
打开浏览器访问 `http://localhost:3001`

### 环境变量配置

主要配置项说明：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=study_tracker_dev

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key

# 邮件配置（可选）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# 管理员配置
DEFAULT_ADMIN_PASSWORD=Admin123!
```

## 🚀 使用指南

### 首次使用
1. 访问首页，点击"注册"创建账户
2. 使用邮箱验证完成注册
3. 登录后开始创建学习项目

### 默认账号信息
- **管理员账号**：admin
- **默认密码**：Admin123!
- **管理员地址**：http://localhost:3001/admin

### 基本功能
- **创建项目** - 在项目管理页面添加新的学习项目
- **记录学习** - 在学习记录页面记录学习时长
- **查看统计** - 在仪表板查看学习进度和统计
- **获得成就** - 完成学习目标获得成就徽章
- **积分兑换** - 使用积分兑换虚拟商品

### 管理员功能
- 访问 `/admin` 进入管理后台
- 管理用户账户和权限
- 查看系统统计和日志
- 配置系统参数

**管理员登录信息**：
- 用户名：admin
- 密码：Admin123!
- 登录地址：http://localhost:3001/admin

## 📁 项目结构

```
study-tracker/
├── assets/                 # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript 文件
│   ├── ico/               # 图标文件
│   └── webfonts/          # 字体文件
├── database/              # 数据库相关
│   ├── migrations/        # 数据库迁移
│   ├── seeds/             # 数据库种子
│   └── db.js              # 数据库连接
├── middleware/            # 中间件
├── routes/                # 路由文件
├── services/              # 业务服务
├── utils/                 # 工具函数
├── views/                 # 视图模板
├── scripts/               # 脚本文件
├── uploads/               # 上传文件
├── public/                # 公共文件
└── docs/                  # 文档
```

## 🔧 开发指南

### 构建命令
```bash
# 构建 CSS（包含 PurgeCSS 优化）
npm run build:css

# 构建 JavaScript
npm run build:js

# 完整构建
npm run build

# 分析 CSS 文件
npm run analyze:css

# 优化构建
npm run build:optimized
```

### Docker 开发命令
```bash
# 构建 Docker 镜像
npm run docker:build

# 构建开发环境镜像
npm run docker:build-dev

# 启动 Docker 服务
npm run docker:up

# 启动开发环境服务
npm run docker:up-dev

# 查看 Docker 日志
npm run docker:logs

# 停止 Docker 服务
npm run docker:down
```

### 数据库操作
```bash
# 运行迁移
npm run db:migrate

# 回滚迁移
npm run db:rollback

# 运行种子
npm run db:seed

# 重置数据库
npm run db:reset

# 清理数据库
npm run db:clean
```

### 代码质量
```bash
# 代码检查
npm run quality

# 运行测试
npm run test

# 完整工作流
npm run workflow
```

## 🔒 安全特性

- **密码加密** - 使用 bcrypt 加密存储
- **JWT 认证** - 安全的身份验证
- **输入验证** - 完整的输入验证和清理
- **SQL 注入防护** - 使用参数化查询
- **XSS 防护** - 输出编码和 CSP 头
- **CSRF 防护** - CSRF 令牌验证
- **速率限制** - 防止暴力攻击
- **环境变量** - 敏感信息隔离

## 📈 性能优化

- **CSS 优化** - PurgeCSS 清理未使用样式
- **静态资源** - 压缩和缓存优化
- **数据库索引** - 优化的查询性能
- **连接池** - 数据库连接复用
- **缓存策略** - 合理的缓存配置

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📚 相关文档

- [Docker 部署指南](DOCKER_DEPLOYMENT.md) - 详细的 Docker 部署说明
- [数据库设置指南](DATABASE_SETUP.md) - 数据库配置和迁移说明
- [安全配置指南](SECURITY_CHECKLIST.md) - 安全配置最佳实践

## 🙏 致谢

- [Express.js](https://expressjs.com/) - Web 应用框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [PostgreSQL](https://www.postgresql.org/) - 数据库
- [Knex.js](http://knexjs.org/) - SQL 查询构建器
- [HTMX](https://htmx.org/) - 现代 JavaScript 库
- [Docker](https://www.docker.com/) - 容器化平台

## 📞 联系方式

- 项目主页：[GitHub Repository](https://github.com/your-username/study-tracker)
- 问题反馈：[Issues](https://github.com/your-username/study-tracker/issues)
- 功能建议：[Discussions](https://github.com/your-username/study-tracker/discussions)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！ 