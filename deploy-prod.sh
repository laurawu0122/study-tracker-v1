#!/bin/bash

echo "🚀 使用预构建镜像部署学习追踪系统..."

# 1. 下载配置文件
echo "📥 下载配置文件..."
curl -o docker-compose.yml https://raw.githubusercontent.com/laurawu0122/study-tracker/main/docker-compose.prod.yml

# 2. 创建必要目录
mkdir -p logs uploads/avatars

# 3. 拉取镜像
echo "📦 拉取预构建镜像..."
docker pull richarvin/study-tracker:latest

# 4. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 5. 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 15

# 6. 初始化数据库
echo "🗄️ 初始化数据库..."
docker-compose exec -T app npm run db:migrate 2>/dev/null || echo "迁移跳过"
docker-compose exec -T app npm run db:seed 2>/dev/null || echo "种子跳过"

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:3001"
echo "👤 管理员账号: admin"
echo "🔑 默认密码: Admin123!"
echo ""
echo "📋 常用命令:"
echo "  查看状态: docker-compose ps"
echo "  查看日志: docker-compose logs -f app"
echo "  停止服务: docker-compose down" 