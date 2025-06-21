# 🚀 部署技术文档

本文档详细介绍了学习项目追踪系统的三种部署方式，包括配置说明、安全设置和故障排除。

## 📋 目录

- [Vercel 部署](#vercel-部署)
- [Cloudflare Pages 部署](#cloudflare-pages-部署)
- [Docker 部署](#docker-部署)
- [SSL 证书配置](#ssl-证书配置)
- [安全配置](#安全配置)
- [监控和维护](#监控和维护)

## 🌐 Vercel 部署

### 优势特点

- ✅ **零配置部署** - 自动检测项目类型
- ✅ **自动SSL** - 免费HTTPS证书
- ✅ **全球CDN** - 极快的访问速度
- ✅ **自动扩展** - 根据流量自动扩展
- ✅ **Git集成** - 支持GitHub自动部署
- ✅ **免费额度** - 个人项目完全免费

### 部署步骤

#### 1. 准备工作

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录Vercel账户
vercel login
```

#### 2. 配置环境变量

在Vercel控制台或使用CLI配置环境变量：

```bash
# 使用CLI配置
vercel env add JWT_SECRET
vercel env add SMTP_HOST
vercel env add SMTP_USER
vercel env add SMTP_PASS
```

#### 3. 一键部署

```bash
# 运行部署脚本
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh
```

#### 4. 自定义域名（可选）

```bash
# 添加自定义域名
vercel domains add yourdomain.com
```

### 配置文件说明

`vercel.json` 配置详解：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

### 限制说明

- **函数执行时间**：最大30秒
- **请求体大小**：最大4.5MB
- **环境变量**：最多100个
- **并发请求**：根据计划限制

## ⚡ Cloudflare Pages 部署

### 优势特点

- ✅ **边缘计算** - 全球边缘节点
- ✅ **DDoS防护** - 自动防护攻击
- ✅ **免费SSL** - 自动证书管理
- ✅ **缓存优化** - 智能缓存策略
- ✅ **实时分析** - 详细的访问统计
- ✅ **Workers集成** - 支持边缘函数

### 部署步骤

#### 1. 安装Wrangler CLI

```bash
# 安装Wrangler
npm install -g wrangler

# 登录Cloudflare
wrangler login
```

#### 2. 配置项目

```bash
# 初始化项目配置
wrangler init study-tracker

# 配置环境变量
wrangler secret put JWT_SECRET
wrangler secret put SMTP_PASS
```

#### 3. 部署应用

```bash
# 运行部署脚本
chmod +x scripts/deploy-cloudflare.sh
./scripts/deploy-cloudflare.sh
```

### 配置文件说明

`wrangler.toml` 配置详解：

```toml
name = "study-tracker"
main = "server.js"
compatibility_date = "2024-01-01"

[env.production]
name = "study-tracker-prod"

[env.staging]
name = "study-tracker-staging"

[build]
command = "npm install"

[[env.production.routes]]
pattern = "api/*"
script = "server.js"
```

## 🐳 Docker 部署

### 优势特点

- ✅ **完全控制** - 自定义部署环境
- ✅ **数据私有** - 数据完全本地存储
- ✅ **扩展性强** - 支持集群部署
- ✅ **版本管理** - 精确的版本控制
- ✅ **隔离环境** - 应用环境隔离
- ✅ **企业级** - 适合生产环境

### 部署步骤

#### 1. 环境准备

```bash
# 检查Docker版本
docker --version
docker-compose --version

# 创建必要目录
mkdir -p data ssl
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件
nano .env
```

#### 3. 生成SSL证书

```bash
# 自签名证书（开发环境）
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

#### 4. 启动服务

```bash
# 运行部署脚本
chmod +x scripts/deploy-docker.sh
./scripts/deploy-docker.sh
```

### Docker Compose 配置

`docker-compose.yml` 详解：

```yaml
version: '3.8'

services:
  study-tracker:
    build: .
    container_name: study-tracker
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    networks:
      - study-tracker-network

  nginx:
    image: nginx:alpine
    container_name: study-tracker-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - study-tracker
    restart: unless-stopped
    networks:
      - study-tracker-network

networks:
  study-tracker-network:
    driver: bridge
```

## 🔐 SSL 证书配置

### Let's Encrypt 证书

#### 1. 安装Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

#### 2. 获取证书

```bash
# 自动获取证书
sudo certbot certonly --standalone -d yourdomain.com

# 证书位置
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### 3. 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# 添加到crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 🛡️ 安全配置

### 环境变量安全

```bash
# 生成强密码
openssl rand -base64 32

# 设置环境变量
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
```

### 防火墙配置

```bash
# UFW防火墙（Ubuntu）
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 🚨 故障排除

### 常见问题

#### 1. 端口冲突

```bash
# 查找占用端口
lsof -i :3001
netstat -tulpn | grep :3001

# 终止进程
kill -9 <PID>
```

#### 2. 权限问题

```bash
# 修复文件权限
chmod 755 scripts/
chmod 644 .env
chown -R $USER:$USER data/
```

#### 3. 内存不足

```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head
```

## 📞 技术支持

如果遇到部署问题，请：

1. 查看本文档的故障排除部分
2. 检查应用日志和系统日志
3. 在GitHub Issues中搜索相关问题
4. 创建新的Issue并提供详细信息

---

**注意**：生产环境部署前请务必进行充分测试，确保所有安全配置正确。 