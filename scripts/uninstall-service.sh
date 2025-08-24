#!/bin/bash

# PPT 체커 시스템 서비스 제거 스크립트

set -e

PROJECT_DIR="/Users/jjh_server/pptchecklocal"

echo "PPT 체커 시스템 서비스를 제거합니다..."

# 서비스 정지
echo "서비스 정지 중..."
launchctl stop com.pptcheck.service 2>/dev/null || true
launchctl stop com.pptcheck.healthcheck 2>/dev/null || true

# launchd 서비스 언로드
echo "시스템 서비스 등록 해제 중..."
launchctl unload ~/Library/LaunchAgents/com.pptcheck.service.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/com.pptcheck.healthcheck.plist 2>/dev/null || true

# 서비스 정지 스크립트 실행
"$PROJECT_DIR/scripts/stop-service.sh"

echo ""
echo "=== 서비스 제거 완료 ==="
echo "plist 파일은 다음 위치에 남아있습니다:"
echo "  ~/Library/LaunchAgents/com.pptcheck.service.plist"
echo "  ~/Library/LaunchAgents/com.pptcheck.healthcheck.plist"
echo ""
echo "완전히 제거하려면 수동으로 삭제하세요."
echo ""