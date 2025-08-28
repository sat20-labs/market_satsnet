#!/bin/bash

# 部署配置
REMOTE_HOST="103.103.245.177"
REMOTE_PATH="/var/www/satsnet.ordx.market"
LOCAL_PATH="./out"
SSH_USER="root"
SSH_KEY=""  # 如果有SSH密钥，可以在这里指定路径

# 密码文件路径
PASSWORD_FILE="$(dirname "$0")/.password"

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

# 读取密码文件
read_password() {
    if [ -f "$PASSWORD_FILE" ]; then
        # 读取密码文件的第一行，去除前后空格和换行符
        PASSWORD=$(head -n 1 "$PASSWORD_FILE" | tr -d '\r\n' | xargs)
        if [ -n "$PASSWORD" ]; then
            log_success "已从密码文件读取密码"
            return 0
        else
            log_error "密码文件为空"
            return 1
        fi
    else
        log_error "密码文件不存在: $PASSWORD_FILE"
        return 1
    fi
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
    
    # 执行bun run build命令
    log_info "执行 bun run build..."
    if bun run build; then
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

    # 如果有SSH密钥，添加密钥参数
    if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
        rsync_args="$rsync_args -e \"ssh -i $SSH_KEY\""
    else
        # 如果没有SSH密钥，使用密码认证
        rsync_args="$rsync_args -e \"sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no\""
    fi

    echo "rsync $rsync_args $LOCAL_PATH/ $SSH_USER@$REMOTE_HOST:$REMOTE_PATH/"
}

# 检查依赖工具
check_dependencies() {
    # 检查rsync
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请先安装 rsync"
        exit 1
    fi

    # 如果没有SSH密钥，检查sshpass
    if [ -z "$SSH_KEY" ] || [ ! -f "$SSH_KEY" ]; then
        if ! command -v sshpass &> /dev/null; then
            log_error "sshpass 未安装，请先安装 sshpass"
            log_info "安装方法:"
            echo "  macOS: brew install sshpass"
            echo "  Ubuntu/Debian: sudo apt-get install sshpass"
            echo "  CentOS/RHEL: sudo yum install sshpass"
            exit 1
        fi
    fi
}

# 执行部署
deploy() {
    log_info "开始部署..."

    # 检查依赖工具
    check_dependencies

    # 构建项目
    build_project

    # 读取密码（如果没有SSH密钥）
    if [ -z "$SSH_KEY" ] || [ ! -f "$SSH_KEY" ]; then
        if ! read_password; then
            log_error "无法读取密码，部署终止"
            exit 1
        fi
    fi

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
        echo "5. 检查密码是否正确"
        exit 1
    fi
}

# 主函数
main() {
    echo "🚀 开始部署到远程服务器..."
    echo ""

    # 显示配置信息
    log_info "部署配置:"
    echo "  远程主机: $REMOTE_HOST"
    echo "  远程路径: $REMOTE_PATH"
    echo "  本地路径: $LOCAL_PATH"
    echo "  SSH用户: $SSH_USER"
    if [ -n "$SSH_KEY" ]; then
        echo "  SSH密钥: $SSH_KEY"
    else
        echo "  密码文件: $PASSWORD_FILE"
    fi
    echo ""

    # 执行部署
    deploy
}

# 运行主函数
main
