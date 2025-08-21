#!/bin/bash

# Cloudflare 터널 관리 스크립트
# macOS/Linux용

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 환경변수 로드
load_env() {
    if [ -f ".env.local" ]; then
        set -a
        source .env.local
        set +a
        log_success ".env.local 파일 로드됨"
    else
        log_warning ".env.local 파일이 없습니다."
    fi
}

# cloudflared 설치 확인
check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        log_warning "cloudflared가 설치되어 있지 않습니다."
        echo
        echo "설치 방법:"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  brew install cloudflared"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  # Ubuntu/Debian:"
            echo "  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
            echo "  sudo dpkg -i cloudflared-linux-amd64.deb"
            echo
            echo "  # 또는 직접 다운로드:"
            echo "  wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
            echo "  chmod +x cloudflared-linux-amd64"
            echo "  sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared"
        fi
        echo
        echo "자세한 설치 방법: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        return 1
    fi
    
    log_success "cloudflared $(cloudflared --version | head -n1 | cut -d' ' -f3) 설치됨"
    return 0
}

# 터널 상태 확인
check_tunnel_status() {
    log_info "터널 상태를 확인합니다..."
    
    if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
        log_warning "CLOUDFLARE_TUNNEL_TOKEN이 설정되지 않았습니다."
        return 1
    fi
    
    # 터널이 실행 중인지 확인
    if pgrep -f "cloudflared.*tunnel.*run" > /dev/null; then
        local pid=$(pgrep -f "cloudflared.*tunnel.*run")
        log_success "터널이 실행 중입니다 (PID: $pid)"
        
        # 도메인 정보 출력
        if [ -n "$CLOUDFLARE_DOMAIN" ]; then
            log_info "도메인: https://$CLOUDFLARE_DOMAIN"
        fi
        
        return 0
    else
        log_warning "터널이 실행 중이지 않습니다."
        return 1
    fi
}

# 터널 시작
start_tunnel() {
    log_info "Cloudflare 터널을 시작합니다..."
    
    if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
        log_error "CLOUDFLARE_TUNNEL_TOKEN이 설정되지 않았습니다."
        echo "다음 단계를 따라 터널 토큰을 설정하세요:"
        echo "1. https://one.dash.cloudflare.com/ 로그인"
        echo "2. Access > Tunnels > Create a tunnel"
        echo "3. 터널 이름 입력 후 토큰 복사"
        echo "4. .env.local에 CLOUDFLARE_TUNNEL_TOKEN=<토큰> 추가"
        return 1
    fi
    
    # 이미 실행 중인지 확인
    if pgrep -f "cloudflared.*tunnel.*run" > /dev/null; then
        log_warning "터널이 이미 실행 중입니다."
        return 0
    fi
    
    log_info "터널 토큰: ${CLOUDFLARE_TUNNEL_TOKEN:0:20}..."
    
    # 백그라운드에서 터널 실행
    nohup cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN" > tunnel.log 2>&1 &
    local tunnel_pid=$!
    
    sleep 3
    
    if kill -0 $tunnel_pid 2>/dev/null; then
        log_success "터널이 시작되었습니다 (PID: $tunnel_pid)"
        echo "  • 로그 파일: tunnel.log"
        if [ -n "$CLOUDFLARE_DOMAIN" ]; then
            echo "  • 도메인: https://$CLOUDFLARE_DOMAIN"
        fi
        echo "  • 로그 확인: tail -f tunnel.log"
    else
        log_error "터널 시작에 실패했습니다."
        echo "로그를 확인하세요: cat tunnel.log"
        return 1
    fi
}

# 터널 중지
stop_tunnel() {
    log_info "Cloudflare 터널을 중지합니다..."
    
    local tunnel_pids=$(pgrep -f "cloudflared.*tunnel.*run" || true)
    
    if [ -z "$tunnel_pids" ]; then
        log_warning "실행 중인 터널이 없습니다."
        return 0
    fi
    
    for pid in $tunnel_pids; do
        kill $pid
        log_success "터널 프로세스 $pid 종료됨"
    done
    
    sleep 2
    
    # 강제 종료가 필요한 경우
    local remaining_pids=$(pgrep -f "cloudflared.*tunnel.*run" || true)
    if [ -n "$remaining_pids" ]; then
        log_warning "일부 프로세스가 여전히 실행 중입니다. 강제 종료합니다..."
        for pid in $remaining_pids; do
            kill -9 $pid
            log_success "터널 프로세스 $pid 강제 종료됨"
        done
    fi
}

# 터널 재시작
restart_tunnel() {
    log_info "Cloudflare 터널을 재시작합니다..."
    stop_tunnel
    sleep 2
    start_tunnel
}

# 터널 로그 보기
show_logs() {
    if [ -f "tunnel.log" ]; then
        log_info "터널 로그를 표시합니다..."
        echo
        tail -n 50 tunnel.log
        echo
        log_info "실시간 로그: tail -f tunnel.log"
    else
        log_warning "터널 로그 파일이 없습니다."
    fi
}

# 터널 설정 가이드
setup_guide() {
    echo
    echo "🌐 Cloudflare 터널 설정 가이드"
    echo
    echo "1. Cloudflare 계정 로그인"
    echo "   https://one.dash.cloudflare.com/"
    echo
    echo "2. 터널 생성"
    echo "   • Zero Trust > Access > Tunnels"
    echo "   • 'Create a tunnel' 클릭"
    echo "   • 터널 이름 입력 (예: ppt-checker)"
    echo
    echo "3. 터널 설정"
    echo "   • Public hostname 추가"
    echo "   • Subdomain: your-app (원하는 이름)"
    echo "   • Domain: 본인 도메인 선택"
    echo "   • Service: HTTP://localhost:3333"
    echo
    echo "4. 터널 토큰 복사"
    echo "   • 'Install and run a connector' 단계에서"
    echo "   • 토큰 부분만 복사 (cloudflared tunnel run --token 다음 부분)"
    echo
    echo "5. 환경변수 설정"
    echo "   • .env.local 파일에 추가:"
    echo "   • CLOUDFLARE_TUNNEL_TOKEN=your-token-here"
    echo "   • CLOUDFLARE_DOMAIN=your-app.your-domain.com"
    echo
    echo "6. 터널 실행"
    echo "   ./scripts/cloudflare-tunnel.sh start"
    echo
}

# 터널 상태 대시보드
status_dashboard() {
    clear
    echo "🌐 Cloudflare 터널 상태 대시보드"
    echo "=================================="
    echo
    
    # 환경변수 상태
    echo "📋 설정 상태:"
    if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
        echo "  ✅ 터널 토큰: 설정됨 (${CLOUDFLARE_TUNNEL_TOKEN:0:20}...)"
    else
        echo "  ❌ 터널 토큰: 설정되지 않음"
    fi
    
    if [ -n "$CLOUDFLARE_DOMAIN" ]; then
        echo "  ✅ 도메인: $CLOUDFLARE_DOMAIN"
    else
        echo "  ⚠️  도메인: 설정되지 않음"
    fi
    echo
    
    # cloudflared 상태
    echo "🔧 cloudflared 상태:"
    if command -v cloudflared &> /dev/null; then
        echo "  ✅ cloudflared 설치됨: $(cloudflared --version | head -n1 | cut -d' ' -f3)"
    else
        echo "  ❌ cloudflared 설치되지 않음"
    fi
    echo
    
    # 터널 프로세스 상태
    echo "🚇 터널 상태:"
    local tunnel_pids=$(pgrep -f "cloudflared.*tunnel.*run" || true)
    if [ -n "$tunnel_pids" ]; then
        for pid in $tunnel_pids; do
            echo "  ✅ 실행 중 (PID: $pid)"
            if command -v ps &> /dev/null; then
                local runtime=$(ps -o etime= -p $pid | tr -d ' ')
                echo "     실행 시간: $runtime"
            fi
        done
        
        if [ -n "$CLOUDFLARE_DOMAIN" ]; then
            echo "  🌐 URL: https://$CLOUDFLARE_DOMAIN"
        fi
    else
        echo "  ❌ 실행 중이지 않음"
    fi
    echo
    
    # 로그 파일 상태
    if [ -f "tunnel.log" ]; then
        local log_size=$(du -h tunnel.log | cut -f1)
        local log_lines=$(wc -l < tunnel.log)
        echo "📄 로그 파일: tunnel.log ($log_size, ${log_lines}줄)"
        echo "   최근 로그 (마지막 3줄):"
        tail -n 3 tunnel.log | sed 's/^/     /'
    else
        echo "📄 로그 파일: 없음"
    fi
}

# 사용법 출력
show_usage() {
    echo "Cloudflare 터널 관리 스크립트"
    echo
    echo "사용법: $0 [명령어]"
    echo
    echo "명령어:"
    echo "  start     터널 시작"
    echo "  stop      터널 중지"  
    echo "  restart   터널 재시작"
    echo "  status    터널 상태 확인"
    echo "  logs      터널 로그 보기"
    echo "  dashboard 상태 대시보드 표시"
    echo "  guide     설정 가이드 보기"
    echo "  check     cloudflared 설치 확인"
    echo
    echo "예시:"
    echo "  $0 start    # 터널 시작"
    echo "  $0 status   # 상태 확인"
    echo "  $0 logs     # 로그 보기"
}

# 메인 함수
main() {
    case ${1:-status} in
        "start")
            load_env
            if check_cloudflared; then
                start_tunnel
            fi
            ;;
        "stop")
            stop_tunnel
            ;;
        "restart")
            load_env
            if check_cloudflared; then
                restart_tunnel
            fi
            ;;
        "status")
            load_env
            check_tunnel_status
            ;;
        "logs")
            show_logs
            ;;
        "dashboard")
            load_env
            status_dashboard
            ;;
        "guide")
            setup_guide
            ;;
        "check")
            check_cloudflared
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi