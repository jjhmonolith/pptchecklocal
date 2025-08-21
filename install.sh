#!/bin/bash

# PPT 맞춤법 검사기 원클릭 설치 스크립트
# macOS/Linux용

set -e  # 에러 발생시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수들
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 시스템 요구사항 확인
check_requirements() {
    log_info "시스템 요구사항을 확인합니다..."
    
    # Node.js 버전 확인
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        log_info "Node.js 18 이상을 설치해주세요: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 버전이 너무 낮습니다. (현재: $(node --version), 필요: v18+)"
        log_info "Node.js 18 이상으로 업데이트해주세요: https://nodejs.org/"
        exit 1
    fi
    
    log_success "Node.js $(node --version) 확인됨"
    
    # npm 확인
    if ! command -v npm &> /dev/null; then
        log_error "npm이 설치되어 있지 않습니다."
        exit 1
    fi
    
    log_success "npm $(npm --version) 확인됨"
    
    # Git 확인 (선택사항)
    if ! command -v git &> /dev/null; then
        log_warning "Git이 설치되어 있지 않습니다. 수동 다운로드가 필요할 수 있습니다."
    else
        log_success "Git $(git --version | cut -d' ' -f3) 확인됨"
    fi
}

# 저장소 클론 또는 다운로드
download_project() {
    log_info "PPT 맞춤법 검사기를 다운로드합니다..."
    
    PROJECT_NAME="pptchecklocal"
    REPO_URL="https://github.com/jjhmonolith/pptchecklocal.git"
    
    if [ -d "$PROJECT_NAME" ]; then
        log_warning "프로젝트 디렉토리가 이미 존재합니다."
        read -p "기존 디렉토리를 삭제하고 새로 다운로드하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_NAME"
            log_success "기존 디렉토리 삭제 완료"
        else
            log_info "기존 디렉토리를 사용합니다."
            cd "$PROJECT_NAME"
            return
        fi
    fi
    
    if command -v git &> /dev/null; then
        git clone "$REPO_URL" "$PROJECT_NAME"
        log_success "Git 클론 완료"
    else
        log_warning "Git이 없어 수동 다운로드를 시도합니다..."
        # 수동 다운로드 로직 (curl/wget 사용)
        if command -v curl &> /dev/null; then
            curl -L "https://github.com/jjhmonolith/pptchecklocal/archive/main.zip" -o "${PROJECT_NAME}.zip"
            unzip "${PROJECT_NAME}.zip"
            mv "${PROJECT_NAME}-main" "$PROJECT_NAME"
            rm "${PROJECT_NAME}.zip"
            log_success "수동 다운로드 완료"
        else
            log_error "Git과 curl이 모두 없어 다운로드할 수 없습니다."
            exit 1
        fi
    fi
    
    cd "$PROJECT_NAME"
}

# 의존성 설치
install_dependencies() {
    log_info "프로젝트 의존성을 설치합니다..."
    
    # npm install 실행
    npm install
    
    log_success "의존성 설치 완료"
}

# 초기 설정 실행
run_setup() {
    log_info "초기 설정을 실행합니다..."
    
    npm run setup
    
    log_success "초기 설정 완료"
}

# 포트 확인
check_port() {
    PORT=3333
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; then
            log_warning "포트 $PORT가 이미 사용 중입니다."
            log_info "다른 애플리케이션을 종료하거나, .env.local에서 PORT를 변경하세요."
        else
            log_success "포트 $PORT 사용 가능"
        fi
    fi
}

# 방화벽 안내
firewall_info() {
    log_info "방화벽 설정 안내"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        log_info "macOS 방화벽에서 Node.js의 네트워크 접근을 허용해주세요."
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        log_info "방화벽에서 포트 3333을 허용해주세요:"
        log_info "  Ubuntu/Debian: sudo ufw allow 3333"
        log_info "  CentOS/RHEL: sudo firewall-cmd --add-port=3333/tcp --permanent"
    fi
}

# Cloudflare 터널 안내
cloudflare_info() {
    log_info "Cloudflare 터널 설정 (선택사항)"
    echo
    echo "외부에서 접근하려면 Cloudflare 터널을 설정할 수 있습니다:"
    echo "1. https://one.dash.cloudflare.com/ 로그인"
    echo "2. Access > Tunnels > Create a tunnel"
    echo "3. 터널 이름 입력 후 토큰 복사"
    echo "4. .env.local에 토큰 설정"
    echo "5. 터널 실행: cloudflared tunnel run --token <your-token>"
    echo
}

# 설치 완료 메시지
installation_complete() {
    echo
    echo "🎉 PPT 맞춤법 검사기 설치가 완료되었습니다!"
    echo
    echo "다음 단계:"
    echo "1. 개발 서버 실행: npm run dev"
    echo "2. 브라우저에서 http://localhost:3333 접속"
    echo "3. .env.local 파일의 AUTH_PASSWORD로 로그인"
    echo
    echo "유용한 명령어:"
    echo "• npm run dev     : 개발 서버 실행"
    echo "• npm run build   : 프로덕션 빌드"  
    echo "• npm run start   : 프로덕션 서버 실행"
    echo "• npm run cleanup : 임시 파일 정리"
    echo
    echo "📚 자세한 내용은 README.md를 참고하세요."
    echo
    log_success "설치 완료! 이제 서버를 시작할 수 있습니다."
}

# 에러 핸들링
handle_error() {
    log_error "설치 중 오류가 발생했습니다."
    echo
    echo "문제 해결:"
    echo "1. Node.js 18+ 버전 확인"
    echo "2. 네트워크 연결 확인"
    echo "3. 디스크 공간 확인"
    echo "4. 권한 문제 확인"
    echo
    echo "도움이 필요하시면 GitHub Issues에 등록해 주세요:"
    echo "https://github.com/jjhmonolith/pptchecklocal/issues"
    exit 1
}

# 메인 실행 함수
main() {
    # 에러 핸들러 설정
    trap handle_error ERR
    
    echo "🚀 PPT 맞춤법 검사기 원클릭 설치를 시작합니다..."
    echo
    
    # 설치 단계 실행
    check_requirements
    echo
    
    download_project
    echo
    
    install_dependencies
    echo
    
    run_setup
    echo
    
    check_port
    echo
    
    firewall_info
    echo
    
    cloudflare_info
    
    installation_complete
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi