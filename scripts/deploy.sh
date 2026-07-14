#!/bin/bash

# 部署配置
REMOTE_HOST="103.103.245.177"
REMOTE_PATH="/var/www/satsnet.ordx.market"
LOCAL_PATH="./out"
SSH_USER="root"
SSH_PORT="${DEPLOY_SSH_PORT:-20222}"
SSH_KEY="${DEPLOY_SSH_KEY:-}"  # 如果有SSH密钥，可以通过 DEPLOY_SSH_KEY 指定路径
BACKUP_DIR="${DEPLOY_BACKUP_DIR:-/var/backups/satsnet.ordx.market}"
BACKUP_KEEP="${DEPLOY_BACKUP_KEEP:-10}"
SKIP_BACKUP="${DEPLOY_SKIP_BACKUP:-0}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 显示帮助信息
show_usage() {
    echo "用法: $0 [--skip-backup|--no-backup]"
    echo ""
    echo "选项:"
    echo "  --skip-backup, --no-backup  跳过部署前远端备份"
    echo "  -h, --help                  显示帮助信息"
    echo ""
    echo "环境变量:"
    echo "  DEPLOY_BACKUP_DIR           备份目录，默认: $BACKUP_DIR"
    echo "  DEPLOY_BACKUP_KEEP          保留最近 N 份备份，默认: $BACKUP_KEEP"
    echo "  DEPLOY_SKIP_BACKUP=1        跳过备份"
    echo "  DEPLOY_SSH_PORT=20222       指定 SSH 端口，默认: $SSH_PORT"
    echo "  DEPLOY_SSH_KEY=/path/key    指定 SSH key（未指定时使用 SSH agent/配置）"
}

# 解析命令行参数
parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --skip-backup|--no-backup)
                SKIP_BACKUP="1"
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
}

# 清空out目录并重新构建
build_project() {
    log_info "开始构建项目..."
    
    # 清空out目录
    if [ -d "$LOCAL_PATH" ]; then
        log_info "清空out目录..."
        rm -rf "$LOCAL_PATH"
        log_success "out目录已清空"
    fi
    
    local build_cmd
    if command -v bun >/dev/null 2>&1; then
        build_cmd="bun run build"
    elif command -v npm >/dev/null 2>&1; then
        build_cmd="npm run build"
    else
        log_error "未检测到 Bun 或 npm，请先安装 Node.js/npm 或 Bun"
        exit 1
    fi

    log_info "执行构建命令: $build_cmd"
    if eval "$build_cmd"; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi
    
    # 检查构建后的out目录
    if [ ! -d "$LOCAL_PATH" ]; then
        log_error "构建后out目录不存在: $LOCAL_PATH"
        exit 1
    fi
    log_success "本地目录检查通过: $LOCAL_PATH"
}

# 构建rsync命令
build_rsync_command() {
    local rsync_args="-avz --delete --progress"

    # 排除不需要的文件
    rsync_args="$rsync_args --exclude=node_modules"
    rsync_args="$rsync_args --exclude=.git"
    rsync_args="$rsync_args --exclude=.DS_Store"

    # 如果有SSH密钥，添加密钥参数；否则使用本机 SSH agent/配置。
    if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
        rsync_args="$rsync_args -e \"ssh -p $SSH_PORT -i $SSH_KEY -o StrictHostKeyChecking=yes\""
    else
        rsync_args="$rsync_args -e \"ssh -p $SSH_PORT -o StrictHostKeyChecking=yes\""
    fi

    echo "rsync $rsync_args $LOCAL_PATH/ $SSH_USER@$REMOTE_HOST:$REMOTE_PATH/"
}

# 部署前备份远端目录
backup_remote_path() {
    if [ "$SKIP_BACKUP" = "1" ]; then
        log_warning "已跳过部署前备份"
        return 0
    fi

    local remote_parent
    local remote_name
    local backup_file
    local remote_command

    remote_parent="$(dirname "$REMOTE_PATH")"
    remote_name="$(basename "$REMOTE_PATH")"
    backup_file="${remote_name}-$(date +%Y%m%d-%H%M%S).tar.gz"

    log_info "备份远端目录到: $REMOTE_HOST:$BACKUP_DIR/$backup_file"

    remote_command="set -e; if [ -d '$REMOTE_PATH' ]; then mkdir -p '$BACKUP_DIR'; tar -C '$remote_parent' -czf '$BACKUP_DIR/$backup_file' '$remote_name'; ls -lh '$BACKUP_DIR/$backup_file'; if [ '$BACKUP_KEEP' -gt 0 ] 2>/dev/null; then find '$BACKUP_DIR' -maxdepth 1 -type f -name '${remote_name}-*.tar.gz' -printf '%T@ %p\n' | sort -rn | awk 'NR > '$BACKUP_KEEP' {print \$2}' | xargs -r rm -f; fi; else echo '远端目录不存在，跳过备份。'; fi"

    if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
        ssh -p "$SSH_PORT" -o StrictHostKeyChecking=yes -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "$remote_command"
    else
        ssh -p "$SSH_PORT" -o StrictHostKeyChecking=yes "$SSH_USER@$REMOTE_HOST" "$remote_command"
    fi

    if [ $? -eq 0 ]; then
        log_success "远端备份完成"
    else
        log_error "远端备份失败，部署终止"
        exit 1
    fi
}

# 检查依赖工具
check_dependencies() {
    # 检查rsync
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请先安装 rsync"
        exit 1
    fi

}

# 执行部署
deploy() {
    log_info "开始部署..."

    # 检查依赖工具
    check_dependencies

    # 构建项目
    build_project

    # 部署前备份远端目录
    backup_remote_path

    # 构建rsync命令
    local rsync_command=$(build_rsync_command)

    log_info "执行命令: $rsync_command"

    # 执行rsync命令
    if eval $rsync_command; then
        log_success "部署完成！"
        log_info "文件已上传到: $REMOTE_HOST:$REMOTE_PATH"
    else
        log_error "部署失败！"
        echo ""
        echo "可能的解决方案:"
        echo "1. 确保远程服务器可以访问"
        echo "2. 检查SSH连接是否正常"
        echo "3. 确认远程目录权限"
        echo "4. 如果使用SSH密钥，请检查密钥文件路径"
        echo "5. 检查 SSH key 或 SSH agent 是否已配置"
        exit 1
    fi
}

# 主函数
main() {
    parse_args "$@"

    echo "🚀 开始部署到远程服务器..."
    echo ""

    # 显示配置信息
    log_info "部署配置:"
    echo "  远程主机: $REMOTE_HOST"
    echo "  远程路径: $REMOTE_PATH"
    echo "  本地路径: $LOCAL_PATH"
    echo "  SSH用户: $SSH_USER"
    echo "  备份目录: $BACKUP_DIR"
    echo "  保留备份: $BACKUP_KEEP"
    if [ "$SKIP_BACKUP" = "1" ]; then
        echo "  部署前备份: 跳过"
    else
        echo "  部署前备份: 启用"
    fi
    if [ -n "$SSH_KEY" ]; then
        echo "  SSH密钥: $SSH_KEY"
    else
        echo "  SSH认证: SSH agent/系统 ssh 配置"
    fi
    echo ""

    # 执行部署
    deploy
}

# 运行主函数
main "$@"
