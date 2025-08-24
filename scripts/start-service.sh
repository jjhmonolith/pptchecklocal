#!/bin/bash

# PPT 체커 서비스 시작 스크립트
# 재부팅 후 자동으로 모든 서비스를 시작합니다

set -e

# 프로젝트 디렉토리
PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"

# 로그 디렉토리 생성
mkdir -p "$LOGS_DIR"

# 로그 파일 경로
APP_LOG="$LOGS_DIR/app.log"
TUNNEL_LOG="$LOGS_DIR/tunnel.log"
SERVICE_LOG="$LOGS_DIR/service.log"

echo "$(date): PPT 체커 서비스 시작" >> "$SERVICE_LOG"

# 프로젝트 디렉토리로 이동
cd "$PROJECT_DIR"

# Node.js 환경 설정
export PATH="/opt/homebrew/bin:$PATH"
export NODE_ENV=production

# 기존 프로세스 정리
echo "$(date): 기존 프로세스 정리 중..." >> "$SERVICE_LOG"
pkill -f "pptcheck-local" || true
pkill -f "next start" || true
sleep 2

# 1. Next.js 프로덕션 서버 시작
echo "$(date): Next.js 서버 시작 중..." >> "$SERVICE_LOG"
nohup npm run start > "$APP_LOG" 2>&1 &
APP_PID=$!
echo "$(date): Next.js 서버 시작됨 (PID: $APP_PID)" >> "$SERVICE_LOG"

# 서버가 시작될 때까지 대기
echo "$(date): 서버 시작 대기 중..." >> "$SERVICE_LOG"
for i in {1..30}; do
    if curl -s http://localhost:3333 > /dev/null 2>&1; then
        echo "$(date): 서버가 성공적으로 시작되었습니다" >> "$SERVICE_LOG"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "$(date): 서버 시작 실패 - 타임아웃" >> "$SERVICE_LOG"
        exit 1
    fi
    sleep 2
done

# 2. Cloudflare 터널 시작
echo "$(date): Cloudflare 터널 시작 중..." >> "$SERVICE_LOG"
nohup cloudflared tunnel run pptcheck-local > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "$(date): Cloudflare 터널 시작됨 (PID: $TUNNEL_PID)" >> "$SERVICE_LOG"

# PID 저장
echo "$APP_PID" > "$PROJECT_DIR/app.pid"
echo "$TUNNEL_PID" > "$PROJECT_DIR/tunnel.pid"

echo "$(date): 모든 서비스가 성공적으로 시작되었습니다" >> "$SERVICE_LOG"
echo "$(date): App PID: $APP_PID, Tunnel PID: $TUNNEL_PID" >> "$SERVICE_LOG"