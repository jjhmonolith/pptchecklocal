#!/bin/bash

# PPT 체커 서비스 상태 확인 스크립트

PROJECT_DIR="/Users/jjh_server/pptchecklocal"

echo "=== PPT 체커 서비스 상태 ==="
echo ""

# 1. launchd 서비스 상태
echo "📋 시스템 서비스 상태:"
echo "Main Service: $(launchctl list | grep com.pptcheck.service | awk '{print $1}' || echo "Not Running")"
echo "Health Check: $(launchctl list | grep com.pptcheck.healthcheck | awk '{print $1}' || echo "Not Running")"
echo ""

# 2. 프로세스 상태
echo "🔄 실행 중인 프로세스:"
echo "Next.js Server:"
pgrep -fl "next start" || echo "  ❌ Not running"
echo "Cloudflare Tunnel:"
pgrep -fl "pptcheck-local" || echo "  ❌ Not running"
echo ""

# 3. 포트 상태
echo "🌐 네트워크 상태:"
if lsof -i :3333 > /dev/null 2>&1; then
    echo "  ✅ Port 3333: Active"
else
    echo "  ❌ Port 3333: Not listening"
fi
echo ""

# 4. 로컬 서비스 접속 테스트
echo "🔍 로컬 서비스 테스트:"
if curl -s http://localhost:3333 > /dev/null 2>&1; then
    echo "  ✅ Local server: Responding"
else
    echo "  ❌ Local server: Not responding"
fi
echo ""

# 5. 외부 도메인 접속 테스트
echo "🌍 외부 도메인 테스트:"
if curl -s --max-time 10 https://pptcheck.llmclass.org > /dev/null 2>&1; then
    echo "  ✅ External domain: Accessible"
else
    echo "  ⚠️ External domain: Not accessible (터널 문제일 수 있음)"
fi
echo ""

# 6. 최근 로그
echo "📝 최근 로그 (마지막 5줄):"
if [ -f "$PROJECT_DIR/logs/service.log" ]; then
    echo "Service Log:"
    tail -5 "$PROJECT_DIR/logs/service.log" | sed 's/^/  /'
else
    echo "  No service logs found"
fi
echo ""

# 7. PID 파일 상태
echo "📄 PID 파일 상태:"
if [ -f "$PROJECT_DIR/app.pid" ]; then
    APP_PID=$(cat "$PROJECT_DIR/app.pid")
    if kill -0 $APP_PID 2>/dev/null; then
        echo "  ✅ App PID: $APP_PID (running)"
    else
        echo "  ⚠️ App PID: $APP_PID (not running)"
    fi
else
    echo "  ❌ App PID file not found"
fi

if [ -f "$PROJECT_DIR/tunnel.pid" ]; then
    TUNNEL_PID=$(cat "$PROJECT_DIR/tunnel.pid")
    if kill -0 $TUNNEL_PID 2>/dev/null; then
        echo "  ✅ Tunnel PID: $TUNNEL_PID (running)"
    else
        echo "  ⚠️ Tunnel PID: $TUNNEL_PID (not running)"
    fi
else
    echo "  ❌ Tunnel PID file not found"
fi

echo ""
echo "=== 상태 확인 완료 ==="