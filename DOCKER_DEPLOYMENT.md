# Docker 部署指南

本文档介绍如何使用 Docker Compose 一键部署学习追踪系统。

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd study-tracker
```

### 2. 配置环境变量

复制环境变量模板文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```bash
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=study_tracker

# JWT 密钥（请使用强密码）
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# 邮件配置
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# 其他配置
NODE_ENV=production
PORT=3001
```

### 3. 一键部署

#### 生产环境部署

```bash
# 给脚本执行权限
chmod +x scripts/docker-deploy.sh
chmod +x scripts/docker-manage.sh

# 部署生产环境
./scripts/docker-deploy.sh prod
```

#### 开发环境部署

```bash
# 部署开发环境
./scripts/docker-deploy.sh dev
```

### 4. 访问应用

部署完成后，访问以下地址：

- 应用地址：http://localhost:3001
- 默认管理员账号：admin
- 默认密码：Admin123!（可在 .env 中修改）

## 服务架构

部署后包含以下服务：

### 核心服务

- **app**: Node.js 应用服务（端口 3001）
- **postgres**: PostgreSQL 数据库（端口 5432）
- **redis**: Redis 缓存服务（端口 6379）

### 可选服务

- **nginx**: Nginx 反向代理（端口 80/443，仅生产环境）

## 日常管理

### 使用管理脚本

```bash
# 查看服务状态
./scripts/docker-manage.sh status

# 查看应用日志
./scripts/docker-manage.sh logs

# 重启服务
./scripts/docker-manage.sh restart

# 停止服务
./scripts/docker-manage.sh stop

# 启动服务
./scripts/docker-manage.sh start

# 备份数据库
./scripts/docker-manage.sh backup

# 恢复数据库
./scripts/docker-manage.sh restore backups/backup_20250101_120000.sql.gz

# 清理资源
./scripts/docker-manage.sh cleanup

# 进入应用容器
./scripts/docker-manage.sh shell

# 进入数据库容器
./scripts/docker-manage.sh db-shell

# 更新应用
./scripts/docker-manage.sh update
```

### 使用 Docker Compose 命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启特定服务
docker-compose restart app

# 停止所有服务
docker-compose down

# 启动所有服务
docker-compose up -d

# 重新构建镜像
docker-compose build --no-cache
```

## 数据持久化

### 数据卷

系统使用以下数据卷确保数据持久化：

- `postgres_data`: PostgreSQL 数据库数据
- `redis_data`: Redis 缓存数据
- `uploads_data`: 用户上传文件

### 备份策略

#### 自动备份

建议设置定时任务进行自动备份：

```bash
# 添加到 crontab
0 2 * * * cd /path/to/study-tracker && ./scripts/docker-manage.sh backup
```

#### 手动备份

```bash
# 备份数据库
./scripts/docker-manage.sh backup

# 备份文件会保存在 ./backups/ 目录
```

## 监控和日志

### 健康检查

所有服务都配置了健康检查：

- 应用服务：HTTP 健康检查
- 数据库：PostgreSQL 连接检查
- Redis：Redis 连接检查

### 日志管理

```bash
# 查看应用日志
docker-compose logs -f app

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis

# 查看所有服务日志
docker-compose logs -f
```

### 资源监控

```bash
# 查看资源使用情况
docker stats

# 查看服务状态和资源使用
./scripts/docker-manage.sh status
```

## 故障排除

### 常见问题

#### 1. 端口冲突

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3002:3001"  # 改为其他端口
```

#### 2. 数据库连接失败

检查数据库服务状态：

```bash
docker-compose logs postgres
docker-compose exec postgres pg_isready -U postgres
```

#### 3. 应用启动失败

查看应用日志：

```bash
docker-compose logs app
```

#### 4. 内存不足

增加 Docker 内存限制或优化应用配置。

### 重置环境

如果需要完全重置环境：

```bash
# 停止并删除所有容器和卷
docker-compose down -v

# 删除所有镜像
docker rmi $(docker images -q study-tracker-app)

# 重新部署
./scripts/docker-deploy.sh prod
```

## 安全配置

### 生产环境安全建议

1. **修改默认密码**：更改所有默认密码
2. **使用强密钥**：生成强 JWT 密钥
3. **配置 HTTPS**：使用 Nginx 配置 SSL 证书
4. **限制端口访问**：只开放必要端口
5. **定期更新**：保持镜像和依赖更新

### 环境变量安全

- 不要在代码中硬编码敏感信息
- 使用环境变量管理配置
- 定期轮换密钥和密码

## 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

### 缓存优化

- 使用 Redis 缓存热点数据
- 配置适当的缓存策略
- 定期清理过期缓存

## 扩展部署

### 多实例部署

使用 Docker Swarm 或 Kubernetes 进行多实例部署：

```bash
# 初始化 Swarm
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.yml study-tracker
```

### 负载均衡

配置 Nginx 负载均衡：

```nginx
upstream app_servers {
    server app1:3001;
    server app2:3001;
    server app3:3001;
}
```

## 联系支持

如果遇到问题，请：

1. 查看日志文件
2. 检查系统资源
3. 参考故障排除部分
4. 提交 Issue 到项目仓库

---

**注意**：生产环境部署前，请确保已正确配置所有安全设置和环境变量。 