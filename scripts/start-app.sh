#!/bin/bash

# 学习追踪系统应用启动脚本
# 此脚本确保数据库迁移在应用启动前运行

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 等待数据库就绪
wait_for_database() {
    log_info "等待数据库连接..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if node -e "
            const knex = require('knex')(require('./knexfile.js').${NODE_ENV:-development});
            knex.raw('SELECT 1')
                .then(() => {
                    console.log('Database connected successfully');
                    process.exit(0);
                })
                .catch(err => {
                    console.log('Database connection failed:', err.message);
                    process.exit(1);
                });
        " > /dev/null 2>&1; then
            log_success "数据库连接成功"
            return 0
        fi
        
        log_info "尝试 $attempt/$max_attempts - 数据库未就绪，等待5秒..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "数据库连接超时"
    return 1
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if npm run db:migrate; then
        log_success "数据库迁移完成"
    else
        log_warning "数据库迁移失败，可能表已存在"
    fi
}

# 运行数据库种子
run_seeds() {
    log_info "运行数据库种子..."
    
    if npm run db:seed; then
        log_success "数据库种子完成"
    else
        log_warning "数据库种子失败，可能数据已存在"
    fi
}

# 启动应用
start_application() {
    log_info "启动应用..."
    
    if [ "$NODE_ENV" = "development" ]; then
        exec npm run dev
    else
        exec npm start
    fi
}

# 主函数
main() {
    log_info "学习追踪系统启动中..."
    
    # 等待数据库就绪
    if ! wait_for_database; then
        log_error "无法连接到数据库，退出"
        exit 1
    fi
    
    # 运行数据库迁移
    run_migrations
    
    # 运行数据库种子
    run_seeds
    
    # 启动应用
    start_application
}

# 执行主函数
main "$@" 