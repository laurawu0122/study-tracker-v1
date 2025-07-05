#!/bin/bash

# 学习追踪系统 Docker 快速部署脚本
# 使用方法: ./scripts/docker-deploy-fast.sh

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
    log_success "目录创建完成"
}

# 停止现有容器
stop_containers() {
    log_info "停止现有容器..."
    $COMPOSE_CMD -f docker-compose.fast.yml down --remove-orphans || true
    log_success "容器停止完成"
}

# 拉取镜像
pull_images() {
    log_info "拉取 Docker 镜像..."
    
    # 拉取基础镜像
    docker pull postgres:15-alpine
    docker pull redis:7-alpine
    
    # 拉取应用镜像（如果存在）
    if docker pull laurawu0122/study-tracker:latest 2>/dev/null; then
        log_success "应用镜像拉取成功"
    else
        log_warning "预构建镜像不存在，将使用本地构建"
        log_info "正在构建应用镜像..."
        docker build -t laurawu0122/study-tracker:latest .
        log_success "应用镜像构建完成"
    fi
    
    log_success "镜像准备完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    $COMPOSE_CMD -f docker-compose.fast.yml up -d
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    timeout=60
    counter=0
    while ! $COMPOSE_CMD -f docker-compose.fast.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
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
    $COMPOSE_CMD -f docker-compose.fast.yml exec -T app npm run db:migrate || log_warning "数据库迁移失败，可能表已存在"
    
    # 运行数据库种子
    log_info "运行数据库种子..."
    $COMPOSE_CMD -f docker-compose.fast.yml exec -T app npm run db:seed || log_warning "数据库种子运行失败，可能数据已存在"
    
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
    $COMPOSE_CMD -f docker-compose.fast.yml ps
    
    echo ""
    log_success "部署完成！"
    log_info "应用地址: http://localhost:3001"
    log_info "数据库端口: 5432"
    log_info "Redis端口: 6379"
    echo ""
    log_info "查看日志: $COMPOSE_CMD -f docker-compose.fast.yml logs -f app"
    log_info "停止服务: $COMPOSE_CMD -f docker-compose.fast.yml down"
}

# 显示帮助信息
show_help() {
    echo "学习追踪系统 Docker 快速部署脚本"
    echo ""
    echo "使用方法: $0"
    echo ""
    echo "此脚本使用预构建镜像，部署速度更快"
    echo ""
    echo "示例:"
    echo "  $0"
}

# 主函数
main() {
    if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    log_info "开始快速部署学习追踪系统"
    
    check_docker
    check_env_file
    create_directories
    stop_containers
    pull_images
    start_services
    wait_for_services
    show_status
}

# 执行主函数
main "$@" 