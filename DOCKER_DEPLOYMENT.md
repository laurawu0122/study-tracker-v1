# 🐳 Docker 部署详细指南

本指南将帮助您使用Docker部署学习项目完成耗时趋势分析系统。

## 📋 部署前准备

1. **Docker环境**：确保已安装Docker和Docker Compose
2. **项目代码**：从GitHub克隆项目
3. **环境变量**：准备好JWT_SECRET等配置

## 🔧 详细部署步骤

### 第一步：克隆项目

```bash
git clone https://github.com/laurawu0122/study-tracker.git
cd study-tracker
```

### 第二步：配置环境变量

1. **复制环境变量模板**
```bash
cp env.example .env
```

2. **编辑.env文件**
```bash
nano .env
# 或者使用您喜欢的编辑器
```

### 第三步：配置必需的环境变量

#### 🔐 JWT_SECRET（必需）

**自动生成方式（推荐）：**
```bash
# 在终端中生成JWT_SECRET
openssl rand -base64 32
```

**手动配置方式：**
在 `.env` 文件中设置：
```env
JWT_SECRET=your-generated-jwt-secret-here
```

**示例：**
```env
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### 🔑 DEFAULT_ADMIN_PASSWORD（可选）

**设置自定义管理员密码：**
```env
DEFAULT_ADMIN_PASSWORD=your-custom-admin-password
```

**如果不设置：**
- 系统将使用默认密码：`Admin123!`
- 建议设置一个强密码

#### 📧 邮件配置（可选）

如果需要邮件功能，配置以下变量：
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-app-password
```

### 第四步：完整的.env文件示例

```env
# 应用配置
NODE_ENV=production
PORT=3001

# JWT配置（必需）
JWT_SECRET=your-generated-jwt-secret-here

# 默认管理员密码（可选）
DEFAULT_ADMIN_PASSWORD=your-custom-admin-password

# 邮件配置（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-app-password

# 安全配置
TRUST_PROXY=true
```

### 第五步：SSL证书配置（可选）

如果需要HTTPS访问：

```bash
# 创建SSL目录
mkdir -p ssl

# 生成自签名证书
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

### 第六步：启动服务

```bash
# 构建并启动容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 第七步：访问应用

- **HTTP访问**: `http://localhost`
- **HTTPS访问**: `https://localhost`（如果配置了SSL）

### 第八步：登录系统

- **用户名**: `admin`
- **密码**: 
  - 如果设置了 `DEFAULT_ADMIN_PASSWORD`，使用该密码
  - 否则使用默认密码：`Admin123!`

**⚠️ 重要提醒：**
- 首次登录后请立即修改默认密码
- 定期更换JWT_SECRET
- 妥善保管环境变量文件

## 🔍 Docker配置说明

### docker-compose.yml 文件解析

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:3001"      # HTTP端口映射
      - "443:3001"     # HTTPS端口映射
    volumes:
      - ./data:/app/data  # 数据持久化
    environment:
      - NODE_ENV=production
    env_file:
      - .env            # 环境变量文件
```

### Dockerfile 说明

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🐛 常见问题解决

### 1. 容器启动失败

**错误信息：** "Container failed to start"

**解决方案：**
1. 检查环境变量配置
2. 确认JWT_SECRET已设置
3. 查看容器日志：`docker-compose logs`

### 2. 端口冲突

**错误信息：** "Port already in use"

**解决方案：**
```bash
# 修改docker-compose.yml中的端口映射
ports:
  - "8080:3001"  # 使用其他端口
```

### 3. 数据持久化问题

**问题：** 重启容器后数据丢失

**解决方案：**
1. 确认数据卷映射正确
2. 检查data目录权限
3. 备份重要数据

### 4. SSL证书问题

**错误信息：** "SSL certificate error"

**解决方案：**
1. 确认SSL证书文件存在
2. 检查证书有效期
3. 使用有效的SSL证书

## 🔧 高级配置

### 自定义域名

1. 修改 `docker-compose.yml`
2. 配置反向代理（如Nginx）
3. 设置SSL证书

### 数据备份

```bash
# 备份数据库
docker exec -it study-tracker-app cp /app/data/studytracker.db /backup/

# 恢复数据库
docker exec -it study-tracker-app cp /backup/studytracker.db /app/data/
```

### 性能优化

1. **资源限制**
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

2. **日志管理**
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📊 监控和维护

### 查看容器状态

```bash
# 查看所有容器
docker-compose ps

# 查看资源使用
docker stats

# 查看日志
docker-compose logs -f app
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**：`docker-compose logs -f`
2. **检查配置**：确认 `.env` 文件设置正确
3. **重启服务**：`docker-compose restart`
4. **重新构建**：`docker-compose up -d --build`

---

🎉 **恭喜！** 您的学习项目完成耗时趋势分析系统已成功部署到Docker！

现在您可以通过 `http://localhost` 或 `https://localhost` 访问您的应用了。 