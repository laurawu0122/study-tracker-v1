#!/bin/bash

# Study Tracker 部署脚本
# 支持 Docker 和传统部署方式

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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，正在从模板创建..."
        cp env.example .env
        log_info "请编辑 .env 文件配置环境变量"
        exit 1
    fi
}

# Docker 部署
deploy_docker() {
    log_info "开始 Docker 部署..."
    
    check_command docker
    check_command docker-compose
    check_env_file
    
    # 停止现有容器
    log_info "停止现有容器..."
    docker-compose down || true
    
    # 构建并启动
    log_info "构建并启动服务..."
    docker-compose up -d --build
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    docker-compose exec app npm run db:migrate || true
    docker-compose exec app npm run db:seed || true
    
    log_success "Docker 部署完成！"
    log_info "访问地址: http://localhost:3001"
}

# 生产环境 Docker 部署
deploy_docker_prod() {
    log_info "开始生产环境 Docker 部署..."
    
    check_command docker
    check_command docker-compose
    check_env_file
    
    # 检查必要的环境变量
    if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
        log_error "请设置 JWT_SECRET 和 JWT_REFRESH_SECRET 环境变量"
        exit 1
    fi
    
    # 停止现有容器
    log_info "停止现有容器..."
    docker-compose -f docker-compose.prod.yml down || true
    
    # 构建并启动
    log_info "构建并启动生产服务..."
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f docker-compose.prod.yml ps
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    docker-compose -f docker-compose.prod.yml exec app npm run db:migrate || true
    docker-compose -f docker-compose.prod.yml exec app npm run db:seed || true
    
    log_success "生产环境 Docker 部署完成！"
    log_info "访问地址: http://localhost:3001"
}

# 传统部署
deploy_traditional() {
    log_info "开始传统部署..."
    
    check_command node
    check_command npm
    check_env_file
    
    # 安装依赖
    log_info "安装依赖..."
    npm install
    
    # 构建前端资源
    log_info "构建前端资源..."
    npm run build:css
    
    # 设置数据库
    log_info "设置数据库..."
    npm run db:setup
    
    # 启动应用
    log_info "启动应用..."
    npm start &
    
    log_success "传统部署完成！"
    log_info "访问地址: http://localhost:3001"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose down || true
    fi
    
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down || true
    fi
    
    # 停止 Node.js 进程
    pkill -f "node server.js" || true
    
    log_success "服务已停止"
}

# 查看日志
view_logs() {
    log_info "查看应用日志..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose logs -f app
    elif [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml logs -f app
    else
        tail -f logs/*.log
    fi
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."
    
    BACKUP_DIR="backups"
    mkdir -p $BACKUP_DIR
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose exec postgres pg_dump -U postgres study_tracker > $BACKUP_FILE
    else
        pg_dump -U postgres study_tracker > $BACKUP_FILE
    fi
    
    log_success "数据库备份完成: $BACKUP_FILE"
}

# 显示帮助信息
show_help() {
    echo "Study Tracker 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  docker         使用 Docker 部署（开发环境）"
    echo "  docker-prod    使用 Docker 部署（生产环境）"
    echo "  traditional    传统部署方式"
    echo "  stop           停止所有服务"
    echo "  logs           查看应用日志"
    echo "  backup         备份数据库"
    echo "  help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 docker          # Docker 开发环境部署"
    echo "  $0 docker-prod     # Docker 生产环境部署"
    echo "  $0 traditional     # 传统部署"
}

# 主函数
main() {
    case "${1:-help}" in
        docker)
            deploy_docker
            ;;
        docker-prod)
            deploy_docker_prod
            ;;
        traditional)
            deploy_traditional
            ;;
        stop)
            stop_services
            ;;
        logs)
            view_logs
            ;;
        backup)
            backup_database
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@" 