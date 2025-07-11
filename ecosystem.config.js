module.exports = {
  apps: [{
    name: 'study-tracker',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // 防止端口占用导致的死循环重启
    max_restarts: 3,
    min_uptime: '10s',
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 3000,
    // 健康检查
    health_check_grace_period: 3000,
    // 自动重启策略
    restart_delay: 4000,
    // 环境变量
    env_file: '.env'
  }]
}; 