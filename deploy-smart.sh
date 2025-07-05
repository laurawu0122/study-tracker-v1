#!/bin/bash

# 智能一键部署脚本
echo "🚀 开始智能部署学习追踪系统..."

# 1. 下载 docker-compose.yml
echo "📥 下载配置文件..."
curl -o docker-compose.yml https://raw.githubusercontent.com/laurawu0122/study-tracker/main/docker-compose.fast.yml

# 2. 下载环境变量模板
curl -o .env https://raw.githubusercontent.com/laurawu0122/study-tracker/main/env.example

# 3. 创建必要目录
mkdir -p logs uploads/avatars

# 4. 检查预构建镜像是否存在
echo "🔍 检查预构建镜像..."
if docker pull laurawu0122/study-tracker:latest 2>/dev/null; then
    echo "✅ 找到预构建镜像，直接使用"
else
    echo "🔨 预构建镜像不存在，正在构建..."
    # 下载源码
    git clone https://github.com/laurawu0122/study-tracker.git temp-build
    cd temp-build
    docker build -t laurawu0122/study-tracker:latest .
    cd ..
    rm -rf temp-build
    echo "✅ 镜像构建完成"
fi

# 5. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 6. 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 10

# 7. 运行数据库迁移
echo "🗄️ 初始化数据库..."
docker-compose exec -T app npm run db:migrate 2>/dev/null || echo "数据库迁移跳过"
docker-compose exec -T app npm run db:seed 2>/dev/null || echo "数据库种子跳过"

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:3001"
echo "👤 管理员账号: admin"
echo "🔑 默认密码: Admin123!"
echo ""
echo "📋 常用命令:"
echo "  查看状态: docker-compose ps"
echo "  查看日志: docker-compose logs -f app"
echo "  停止服务: docker-compose down" 