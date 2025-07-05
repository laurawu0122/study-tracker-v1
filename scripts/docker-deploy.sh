#!/bin/bash

# 学习追踪系统 Docker 部署脚本
# 使用方法: ./scripts/docker-deploy.sh [dev|prod]

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

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose (支持新旧两种命令)
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "Docker 环境检查通过 (使用命令: $COMPOSE_CMD)"
}

# 检查环境文件
check_env_file() {
    if [ ! -f .env ]; then
        log_warning ".env 文件不存在，正在创建示例文件..."
        cp env.example .env
        log_info "请编辑 .env 文件配置必要的环境变量"
        log_info "特别是数据库密码、JWT密钥和邮件配置"
        read -p "配置完成后按回车继续..."
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    mkdir -p logs
    mkdir -p uploads/avatars
    mkdir -p database/init
    log_success "目录创建完成"
}

# 停止现有容器
stop_containers() {
    log_info "停止现有容器..."
    $COMPOSE_CMD down --remove-orphans || true
    log_success "容器停止完成"
}

# 清理旧镜像
cleanup_images() {
    log_info "清理旧镜像..."
    docker system prune -f || true
    log_success "镜像清理完成"
}

# 构建镜像
build_images() {
    local env=$1
    log_info "构建 Docker 镜像 (环境: $env)..."
    
    if [ "$env" = "dev" ]; then
        $COMPOSE_CMD -f docker-compose.dev.yml build
    else
        $COMPOSE_CMD build
    fi
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local env=$1
    log_info "启动服务 (环境: $env)..."
    
    if [ "$env" = "dev" ]; then
        $COMPOSE_CMD -f docker-compose.dev.yml up -d
    else
        $COMPOSE_CMD up -d
    fi
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    local env=$1
    log_info "等待服务就绪..."
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    timeout=60
    counter=0
    while ! $COMPOSE_CMD exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        sleep 2
        counter=$((counter + 2))
        if [ $counter -ge $timeout ]; then
            log_error "数据库启动超时"
            exit 1
        fi
    done
    log_success "数据库就绪"
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    if [ "$env" = "dev" ]; then
        $COMPOSE_CMD exec -T app npm run db:migrate || log_warning "数据库迁移失败，可能表已存在"
    else
        $COMPOSE_CMD exec -T app npm run db:migrate || log_warning "数据库迁移失败，可能表已存在"
    fi
    
    # 运行数据库种子
    log_info "运行数据库种子..."
    if [ "$env" = "dev" ]; then
        $COMPOSE_CMD exec -T app npm run db:seed || log_warning "数据库种子运行失败，可能数据已存在"
    else
        $COMPOSE_CMD exec -T app npm run db:seed || log_warning "数据库种子运行失败，可能数据已存在"
    fi
    
    # 等待应用就绪
    log_info "等待应用就绪..."
    timeout=120
    counter=0
    while ! curl -f http://localhost:3001/ > /dev/null 2>&1; do
        sleep 3
        counter=$((counter + 3))
        if [ $counter -ge $timeout ]; then
            log_error "应用启动超时"
            exit 1
        fi
    done
    log_success "应用就绪"
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    if [ "$1" = "dev" ]; then
        $COMPOSE_CMD -f docker-compose.dev.yml ps
    else
        $COMPOSE_CMD ps
    fi
    
    echo ""
    log_success "部署完成！"
    log_info "应用地址: http://localhost:3001"
    log_info "数据库端口: 5432"
    log_info "Redis端口: 6379"
    echo ""
    log_info "查看日志: $COMPOSE_CMD logs -f app"
    log_info "停止服务: $COMPOSE_CMD down"
}

# 显示帮助信息
show_help() {
    echo "学习追踪系统 Docker 部署脚本"
    echo ""
    echo "使用方法: $0 [dev|prod]"
    echo ""
    echo "参数:"
    echo "  dev     部署开发环境"
    echo "  prod    部署生产环境"
    echo ""
    echo "示例:"
    echo "  $0 dev"
    echo "  $0 prod"
}

# 主函数
main() {
    local env=${1:-prod}
    
    if [ "$env" = "help" ] || [ "$env" = "-h" ] || [ "$env" = "--help" ]; then
        show_help
        exit 0
    fi
    
    if [ "$env" != "dev" ] && [ "$env" != "prod" ]; then
        log_error "无效的环境参数，请使用 'dev' 或 'prod'"
        echo ""
        show_help
        exit 1
    fi
    
    log_info "开始部署学习追踪系统 (环境: $env)"
    
    check_docker
    check_env_file
    create_directories
    stop_containers
    cleanup_images
    build_images $env
    start_services $env
    wait_for_services $env
    show_status $env
}

# 执行主函数
main "$@" 