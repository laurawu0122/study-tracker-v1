#!/bin/bash

# 项目启动脚本
echo "🚀 启动学习追踪项目..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 检查PostgreSQL是否安装
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL未安装，请先安装PostgreSQL"
    echo "macOS: brew install postgresql"
    echo "Ubuntu: sudo apt install postgresql postgresql-contrib"
    echo "Windows: 下载PostgreSQL官方安装包"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "✅ 环境变量文件已创建，请编辑.env文件配置数据库连接"
    echo "💡 默认配置："
    echo "   DB_HOST=localhost"
    echo "   DB_PORT=5432"
    echo "   DB_USER=postgres"
    echo "   DB_PASSWORD=postgres"
    echo "   DB_NAME=study_tracker_dev"
    echo ""
    echo "请编辑.env文件后重新运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 设置数据库
echo "🗄️  设置数据库..."
npm run db:setup

# 构建CSS
echo "🎨 构建CSS样式..."
npm run build:css

# 启动开发服务器
echo "🌟 启动开发服务器..."
npm run dev 