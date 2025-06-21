#!/bin/bash

# Vercel一键部署脚本
echo "🚀 开始部署到Vercel..."

# 检查是否安装了Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI未安装，正在安装..."
    npm install -g vercel
fi

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，请确保已配置环境变量"
    echo "请复制env.example为.env并填写相应配置"
    exit 1
fi

# 部署到Vercel
echo "📦 正在部署..."
vercel --prod

echo "✅ 部署完成！"
echo "🌐 您的应用已部署到Vercel" 