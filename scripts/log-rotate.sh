#!/bin/bash

# 로그 파일 로테이션 스크립트
# 로그 파일이 너무 커지지 않도록 관리합니다

PROJECT_DIR="/Users/jjh_server/pptchecklocal"
LOGS_DIR="$PROJECT_DIR/logs"
MAX_SIZE_MB=10  # 10MB 이상이면 로테이션

# 로그 디렉토리가 없으면 생성
mkdir -p "$LOGS_DIR"

# 로그 파일 목록
LOG_FILES=(
    "app.log"
    "tunnel.log"
    "service.log"
    "healthcheck.out"
    "healthcheck.err"
    "launchd.out"
    "launchd.err"
)

# 각 로그 파일 체크 및 로테이션
for log_file in "${LOG_FILES[@]}"; do
    log_path="$LOGS_DIR/$log_file"
    
    if [ -f "$log_path" ]; then
        # 파일 크기 확인 (MB 단위)
        size_mb=$(du -m "$log_path" | cut -f1)
        
        if [ "$size_mb" -gt "$MAX_SIZE_MB" ]; then
            echo "$(date): $log_file 로테이션 실행 (크기: ${size_mb}MB)"
            
            # 기존 백업 파일들 이동
            for i in {4..1}; do
                prev=$((i-1))
                if [ -f "${log_path}.${prev}" ]; then
                    mv "${log_path}.${prev}" "${log_path}.${i}"
                fi
            done
            
            # 현재 로그 파일을 .1로 이동
            mv "$log_path" "${log_path}.1"
            
            # 새 로그 파일 생성
            touch "$log_path"
            
            echo "$(date): $log_file 로테이션 완료"
        fi
    fi
done

# 30일 이상 된 백업 로그 삭제
find "$LOGS_DIR" -name "*.log.*" -mtime +30 -delete 2>/dev/null || true

echo "$(date): 로그 로테이션 작업 완료"