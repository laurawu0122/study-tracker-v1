#!/bin/bash

# 超简单一键部署脚本
echo "🚀 开始部署学习追踪系统..."

# 1. 下载 docker-compose.yml
curl -o docker-compose.yml https://raw.githubusercontent.com/laurawu0122/study-tracker/main/docker-compose.fast.yml

# 2. 下载环境变量模板
curl -o .env https://raw.githubusercontent.com/laurawu0122/study-tracker/main/env.example

# 3. 创建必要目录
mkdir -p logs uploads/avatars

# 4. 构建应用镜像（如果预构建镜像不存在）
echo "🔨 构建应用镜像..."
docker build -t laurawu0122/study-tracker:latest .

# 5. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:3001"
echo "👤 管理员账号: admin"
echo "🔑 默认密码: Admin123!"
echo ""
echo "📋 常用命令:"
echo "  查看状态: docker-compose ps"
echo "  查看日志: docker-compose logs -f app"
echo "  停止服务: docker-compose down" 