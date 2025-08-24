#!/bin/bash

# PPT 체커 서비스 재시작 스크립트

set -e

PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"
SERVICE_LOG="$LOGS_DIR/service.log"

echo "$(date): PPT 체커 서비스 재시작" >> "$SERVICE_LOG"

# 서비스 정지
"$PROJECT_DIR/scripts/stop-service.sh"

# 잠시 대기
sleep 5

# 서비스 시작
"$PROJECT_DIR/scripts/start-service.sh"

echo "$(date): 서비스 재시작 완료" >> "$SERVICE_LOG"