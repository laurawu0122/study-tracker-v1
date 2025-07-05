#!/bin/bash

echo "🚀 快速部署学习追踪系统（国内镜像源）..."

# 1. 设置 Docker 镜像源（可选）
echo "📥 配置 Docker 镜像源..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

# 重启 Docker 服务
sudo systemctl daemon-reload
sudo systemctl restart docker

# 2. 克隆项目
if [ ! -d "study-tracker" ]; then
    git clone https://github.com/laurawu0122/study-tracker.git
fi
cd study-tracker

# 3. 使用简单配置
cp docker-compose.simple.yml docker-compose.yml

# 4. 创建目录
mkdir -p logs uploads/avatars

# 5. 拉取基础镜像（使用国内源）
echo "📦 拉取基础镜像..."
docker pull postgres:15-alpine
docker pull redis:7-alpine

# 6. 构建应用镜像
echo "🔨 构建应用镜像..."
docker build --no-cache -t study-tracker-app .

# 7. 修改 docker-compose.yml 使用本地镜像
sed -i 's/build: \./image: study-tracker-app/' docker-compose.yml

# 8. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 9. 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 20

# 10. 初始化数据库
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