#!/bin/bash

# PPT 체커 서비스 헬스체크 및 자동 복구 스크립트

PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"
SERVICE_LOG="$LOGS_DIR/service.log"

# 서비스 상태 체크 함수
check_service() {
    # 1. 로컬 서버 체크
    if ! curl -s http://localhost:3333 > /dev/null 2>&1; then
        echo "$(date): [ALERT] Next.js 서버가 응답하지 않습니다" >> "$SERVICE_LOG"
        return 1
    fi

    # 2. 터널 프로세스 체크
    if ! pgrep -f "pptcheck-local" > /dev/null; then
        echo "$(date): [ALERT] Cloudflare 터널이 실행되지 않습니다" >> "$SERVICE_LOG"
        return 1
    fi

    # 3. 외부 접속 체크 (선택적)
    if ! curl -s --max-time 10 https://pptcheck.llmclass.org > /dev/null 2>&1; then
        echo "$(date): [WARNING] 외부 도메인 접속에 문제가 있을 수 있습니다" >> "$SERVICE_LOG"
        # 외부 접속 실패는 치명적이지 않으므로 재시작하지 않음
    fi

    return 0
}

# 헬스체크 실행
if check_service; then
    echo "$(date): [OK] 모든 서비스가 정상 작동 중입니다" >> "$SERVICE_LOG"
    exit 0
else
    echo "$(date): [ERROR] 서비스에 문제가 발견되어 재시작을 시도합니다" >> "$SERVICE_LOG"
    
    # 서비스 재시작
    "$PROJECT_DIR/scripts/restart-service.sh"
    
    # 재시작 후 재확인
    sleep 10
    if check_service; then
        echo "$(date): [RECOVERY] 서비스가 성공적으로 복구되었습니다" >> "$SERVICE_LOG"
        exit 0
    else
        echo "$(date): [CRITICAL] 서비스 복구에 실패했습니다" >> "$SERVICE_LOG"
        exit 1
    fi
fi