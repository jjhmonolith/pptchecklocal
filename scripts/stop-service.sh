#!/bin/bash

# PPT 체커 서비스 정지 스크립트

set -e

PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"
SERVICE_LOG="$LOGS_DIR/service.log"

echo "$(date): PPT 체커 서비스 정지 시작" >> "$SERVICE_LOG"

cd "$PROJECT_DIR"

# PID 파일에서 프로세스 ID 읽기
if [ -f "app.pid" ]; then
    APP_PID=$(cat app.pid)
    if kill -0 $APP_PID 2>/dev/null; then
        echo "$(date): Next.js 서버 정지 중 (PID: $APP_PID)" >> "$SERVICE_LOG"
        kill $APP_PID || true
        sleep 2
        kill -9 $APP_PID 2>/dev/null || true
    fi
    rm -f app.pid
fi

if [ -f "tunnel.pid" ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    if kill -0 $TUNNEL_PID 2>/dev/null; then
        echo "$(date): Cloudflare 터널 정지 중 (PID: $TUNNEL_PID)" >> "$SERVICE_LOG"
        kill $TUNNEL_PID || true
        sleep 2
        kill -9 $TUNNEL_PID 2>/dev/null || true
    fi
    rm -f tunnel.pid
fi

# 혹시 남은 프로세스들 정리
pkill -f "pptcheck-local" || true
pkill -f "next start" || true
pkill -f "PORT=3333" || true

echo "$(date): 모든 서비스가 정지되었습니다" >> "$SERVICE_LOG"