# 🐳 Docker 快速启动指南

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

## 一键部署

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd study-tracker
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件（可选）
nano .env
```

### 3. 一键部署
```bash
# 生产环境
./scripts/docker-deploy.sh prod

# 或开发环境
./scripts/docker-deploy.sh dev
```

### 4. 访问应用
- 应用地址：http://localhost:3001
- 默认管理员账号：admin
- 默认密码：Admin123!

## 常用管理命令

```bash
# 查看服务状态
./scripts/docker-manage.sh status

# 查看应用日志
./scripts/docker-manage.sh logs

# 重启服务
./scripts/docker-manage.sh restart

# 停止服务
./scripts/docker-manage.sh stop

# 备份数据库
./scripts/docker-manage.sh backup

# 清理资源
./scripts/docker-manage.sh cleanup
```

## 故障排除

### 1. 端口冲突
如果3001端口被占用，修改 `.env` 文件中的 `PORT` 变量：
```bash
PORT=3002
```

### 2. 数据库连接失败
检查数据库配置：
```bash
# 查看数据库容器状态
docker ps | grep postgres

# 查看数据库日志
docker logs study-tracker-db
```

### 3. 应用启动失败
查看应用日志：
```bash
./scripts/docker-manage.sh logs
```

### 4. 权限问题
确保脚本有执行权限：
```bash
chmod +x scripts/*.sh
```

## 开发模式

开发模式支持热重载和调试：

```bash
# 启动开发环境
./scripts/docker-deploy.sh dev

# 查看开发日志
./scripts/docker-manage.sh logs
```

## 生产部署

生产环境包含额外的安全配置：

```bash
# 生产环境部署
./scripts/docker-deploy.sh prod

# 启用Nginx反向代理（可选）
# 取消注释 docker-compose.yml 中的 nginx 服务
```

## 数据持久化

数据存储在Docker卷中：
- 数据库：`postgres_data`
- Redis：`redis_data`
- 上传文件：`uploads_data`

备份数据：
```bash
./scripts/docker-manage.sh backup
```

## 更新应用

```bash
# 拉取最新代码
git pull

# 重新部署
./scripts/docker-deploy.sh prod
```

## 完全清理

```bash
# 停止并删除所有容器
docker-compose down -v

# 删除所有相关镜像
docker rmi study-tracker-app

# 清理未使用的资源
./scripts/docker-manage.sh cleanup
``` 