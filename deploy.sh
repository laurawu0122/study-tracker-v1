#!/bin/bash

# 学习追踪器 Ubuntu 20.04 部署脚本
# 作者: Your Name
# 版本: 1.0.0

set -e

echo "🚀 开始部署学习追踪器..."

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo "❌ 请不要使用root用户运行此脚本"
    exit 1
fi

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装Node.js和npm
echo "📦 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js 已安装"
fi

# 安装PM2进程管理器
echo "📦 安装PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "✅ PM2 已安装"
fi

# 安装nginx
echo "📦 安装nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "✅ nginx 已安装"
fi

# 安装SQLite3
echo "📦 安装SQLite3..."
sudo apt install -y sqlite3

# 创建应用目录
echo "📁 创建应用目录..."
APP_DIR="/home/$USER/studytracker"
mkdir -p $APP_DIR
cd $APP_DIR

# 复制项目文件
echo "📋 复制项目文件..."
cp -r /path/to/your/project/* $APP_DIR/

# 安装依赖
echo "📦 安装项目依赖..."
npm install --production

# 创建环境变量文件
echo "🔧 创建环境配置文件..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)
EOF

# 创建nginx配置文件
echo "🔧 配置nginx..."
sudo tee /etc/nginx/sites-available/studytracker << EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/studytracker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 创建PM2配置文件
echo "🔧 创建PM2配置..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'studytracker',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env'
  }]
};
EOF

# 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# 创建备份脚本
echo "📋 创建备份脚本..."
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups/studytracker"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
cp data/studytracker.db $BACKUP_DIR/studytracker_$DATE.db

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz --exclude=node_modules --exclude=data .

# 保留最近7天的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
EOF

chmod +x backup.sh

# 创建定时备份任务
echo "📅 设置定时备份..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# 创建SSL证书（可选）
echo "🔐 配置SSL证书..."
read -p "是否要配置SSL证书？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt install -y certbot python3-certbot-nginx
    echo "请运行以下命令获取SSL证书："
    echo "sudo certbot --nginx -d your-domain.com"
fi

echo "✅ 部署完成！"
echo ""
echo "📋 部署信息："
echo "应用目录: $APP_DIR"
echo "应用端口: 3000"
echo "PM2状态: pm2 status"
echo "查看日志: pm2 logs studytracker"
echo "重启应用: pm2 restart studytracker"
echo ""
echo "🔧 下一步操作："
echo "1. 编辑 /etc/nginx/sites-available/studytracker 中的域名"
echo "2. 配置SSL证书（如需要）"
echo "3. 访问 http://your-domain.com 测试应用"
echo ""
echo "📚 管理命令："
echo "查看应用状态: pm2 status"
echo "查看应用日志: pm2 logs studytracker"
echo "重启应用: pm2 restart studytracker"
echo "停止应用: pm2 stop studytracker"
echo "删除应用: pm2 delete studytracker" 