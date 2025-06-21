#!/bin/bash

# Cloudflare Pages一键部署脚本
echo "🚀 开始部署到Cloudflare Pages..."

# 检查是否安装了Wrangler CLI
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI未安装，正在安装..."
    npm install -g wrangler
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请先登录Cloudflare账户..."
    wrangler login
fi

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，请确保已配置环境变量"
    echo "请复制env.example为.env并填写相应配置"
    exit 1
fi

# 部署到Cloudflare Pages
echo "📦 正在部署..."
wrangler pages deploy . --project-name study-tracker

echo "✅ 部署完成！"
echo "🌐 您的应用已部署到Cloudflare Pages" 