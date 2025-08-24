#!/bin/bash

# PPT 체커 시스템 서비스 설치 스크립트

set -e

PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"

echo "PPT 체커 시스템 서비스 설치를 시작합니다..."

# 로그 디렉토리 생성
mkdir -p "$LOGS_DIR"

# 스크립트 실행 권한 부여
chmod +x "$PROJECT_DIR/scripts/"*.sh

# launchd 서비스 로드
echo "시스템 서비스 등록 중..."
launchctl load ~/Library/LaunchAgents/com.pptcheck.service.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.pptcheck.healthcheck.plist 2>/dev/null || true

# 서비스 시작
echo "서비스 시작 중..."
launchctl start com.pptcheck.service 2>/dev/null || true
launchctl start com.pptcheck.healthcheck 2>/dev/null || true

sleep 5

# 상태 확인
echo ""
echo "=== 서비스 설치 완료 ==="
echo "다음 명령어로 서비스를 관리할 수 있습니다:"
echo ""
echo "  npm run service:status    # 서비스 상태 확인"
echo "  npm run service:restart   # 서비스 재시작"
echo "  npm run service:stop      # 서비스 정지"
echo "  npm run service:health    # 헬스체크 실행"
echo ""
echo "시스템 재부팅 후에도 자동으로 서비스가 시작됩니다."
echo ""