#!/bin/bash

# 学习追踪系统 Docker 管理脚本
# 使用方法: ./scripts/docker-manage.sh [start|stop|restart|logs|status|backup|restore|cleanup]

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

# 显示帮助信息
show_help() {
    echo "学习追踪系统 Docker 管理脚本"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start    启动所有服务"
    echo "  stop     停止所有服务"
    echo "  restart  重启所有服务"
    echo "  logs     查看应用日志"
    echo "  status   查看服务状态"
    echo "  backup   备份数据库"
    echo "  restore  恢复数据库"
    echo "  cleanup  清理未使用的资源"
    echo "  shell    进入应用容器"
    echo "  db-shell 进入数据库容器"
    echo "  update   更新应用代码并重启"
    echo "  help     显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 logs"
    echo "  $0 backup"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    docker-compose up -d
    log_success "服务启动完成"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down
    log_success "服务停止完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose restart
    log_success "服务重启完成"
}

# 查看日志
show_logs() {
    log_info "查看应用日志..."
    docker-compose logs -f app
}

# 查看状态
show_status() {
    log_info "服务状态:"
    docker-compose ps
    echo ""
    
    # 显示资源使用情况
    log_info "资源使用情况:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 备份数据库
backup_database() {
    local backup_dir="./backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${backup_dir}/backup_${timestamp}.sql"
    
    log_info "备份数据库..."
    
    # 创建备份目录
    mkdir -p "$backup_dir"
    
    # 执行备份
    docker-compose exec -T postgres pg_dump -U postgres study_tracker > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log_success "数据库备份完成: $backup_file"
        
        # 压缩备份文件
        gzip "$backup_file"
        log_info "备份文件已压缩: ${backup_file}.gz"
        
        # 显示备份文件大小
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_info "备份文件大小: $size"
    else
        log_error "数据库备份失败"
        exit 1
    fi
}

# 恢复数据库
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件路径"
        echo "使用方法: $0 restore <备份文件路径>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_warning "此操作将覆盖现有数据库，请确认是否继续？"
    read -p "输入 'yes' 确认: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "操作已取消"
        exit 0
    fi
    
    log_info "恢复数据库..."
    
    # 如果是压缩文件，先解压
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker-compose exec -T postgres psql -U postgres -d study_tracker
    else
        docker-compose exec -T postgres psql -U postgres -d study_tracker < "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "数据库恢复完成"
    else
        log_error "数据库恢复失败"
        exit 1
    fi
}

# 清理资源
cleanup_resources() {
    log_info "清理未使用的资源..."
    
    # 清理未使用的容器
    docker container prune -f
    
    # 清理未使用的镜像
    docker image prune -f
    
    # 清理未使用的网络
    docker network prune -f
    
    # 清理未使用的卷
    docker volume prune -f
    
    # 清理构建缓存
    docker builder prune -f
    
    log_success "资源清理完成"
}

# 进入应用容器
enter_app_shell() {
    log_info "进入应用容器..."
    docker-compose exec app sh
}

# 进入数据库容器
enter_db_shell() {
    log_info "进入数据库容器..."
    docker-compose exec postgres psql -U postgres -d study_tracker
}

# 更新应用
update_app() {
    log_info "更新应用..."
    
    # 停止服务
    stop_services
    
    # 拉取最新代码（如果在git仓库中）
    if [ -d ".git" ]; then
        log_info "拉取最新代码..."
        git pull origin main || git pull origin master
    fi
    
    # 重新构建镜像
    log_info "重新构建镜像..."
    docker-compose build --no-cache app
    
    # 启动服务
    start_services
    
    log_success "应用更新完成"
}

# 主函数
main() {
    local command=$1
    local arg=$2
    
    case "$command" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database "$arg"
            ;;
        "cleanup")
            cleanup_resources
            ;;
        "shell")
            enter_app_shell
            ;;
        "db-shell")
            enter_db_shell
            ;;
        "update")
            update_app
            ;;
        "help"|"-h"|"--help"|"")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 