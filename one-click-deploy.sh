#!/bin/bash

echo "🚀 一键部署学习追踪系统..."

# 1. 克隆项目
if [ ! -d "study-tracker" ]; then
    git clone https://github.com/laurawu0122/study-tracker.git
fi
cd study-tracker

# 2. 使用简单配置
cp docker-compose.simple.yml docker-compose.yml

# 3. 创建目录
mkdir -p logs uploads/avatars

# 4. 启动服务
echo "🔨 构建并启动服务..."
docker-compose up -d --build

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