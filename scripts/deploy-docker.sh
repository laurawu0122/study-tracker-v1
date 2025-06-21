#!/bin/bash

# Docker一键部署脚本
echo "🚀 开始Docker部署..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，正在创建..."
    cp env.example .env
    echo "请编辑.env文件并填写相应配置"
    echo "特别是JWT_SECRET和邮件配置"
    read -p "配置完成后按回车继续..."
fi

# 创建SSL证书目录
mkdir -p ssl

# 检查SSL证书
if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
    echo "🔐 生成自签名SSL证书..."
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
fi

# 构建并启动容器
echo "📦 构建并启动Docker容器..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo "✅ 部署成功！"
    echo "🌐 应用地址: https://localhost"
    echo "📊 健康检查: https://localhost/health"
else
    echo "❌ 部署失败，请检查日志:"
    docker-compose logs
fi 