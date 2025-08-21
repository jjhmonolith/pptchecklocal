# 로컬 환경 개선사항 분석

## 🚨 현재 주요 문제점

### 1. 파일 저장소 문제
- **메모리 기반 저장**: 서버 재시작시 파일 소실
- **휘발성**: 각 API 호출마다 새 인스턴스에서 파일을 찾지 못함
- **크기 제한**: 메모리 사용량으로 인한 제약

### 2. 파일 처리 문제  
- **동기식 처리**: 큰 파일 처리시 블로킹
- **메모리 부족**: 여러 파일 동시 처리시 메모리 오버플로우
- **에러 복구 없음**: 실패시 처음부터 다시 시작

---

## 🔧 필수 수정사항 (로컬 환경)

### 1. 파일 저장소 → 파일시스템
```typescript
// 현재: 메모리 기반
const fileStorage = new Map<string, FileData>();

// 개선: 파일시스템 기반
const UPLOAD_DIR = './uploads';
const TEMP_DIR = './temp';
```

### 2. 데이터베이스 연동
```sql
-- 파일 메타데이터 관리
CREATE TABLE files (
  id VARCHAR PRIMARY KEY,
  filename VARCHAR,
  filepath VARCHAR,
  size INTEGER,
  upload_time TIMESTAMP,
  status VARCHAR
);

-- 작업 상태 관리  
CREATE TABLE jobs (
  id VARCHAR PRIMARY KEY,
  file_id VARCHAR,
  type VARCHAR, -- 'analysis', 'correction'
  status VARCHAR, -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 3. 환경 설정 분리
```env
# .env.local
NODE_ENV=development
DATABASE_URL=sqlite:./data/app.db
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=100MB
CLEANUP_INTERVAL=1h
```

---

## ⚡ 성능 개선사항

### 1. 스트리밍 파일 처리
```typescript
// 현재: 전체 파일을 메모리에 로드
const arrayBuffer = await file.arrayBuffer();

// 개선: 스트리밍 처리
const fileStream = fs.createReadStream(filePath);
const zipStream = new JSZip.external.Promise();
```

### 2. 백그라운드 작업 큐
```typescript
import Bull from 'bull';

const analysisQueue = new Bull('analysis queue');
const correctionQueue = new Bull('correction queue');

// 비동기 작업 처리
analysisQueue.process(async (job) => {
  const { fileId, fileName } = job.data;
  return await processAnalysis(fileId, fileName);
});
```

### 3. 캐싱 시스템
```typescript
import NodeCache from 'node-cache';

const analysisCache = new NodeCache({ stdTTL: 3600 }); // 1시간
const fileCache = new NodeCache({ stdTTL: 1800 }); // 30분

// 분석 결과 캐싱
const cacheKey = `analysis_${fileId}`;
if (analysisCache.has(cacheKey)) {
  return analysisCache.get(cacheKey);
}
```

### 4. 청크 단위 처리
```typescript
// PPTX 파일을 청크 단위로 처리
async function processLargePPTX(filePath: string, chunkSize = 1024 * 1024) {
  const chunks = [];
  const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
  
  for await (const chunk of stream) {
    chunks.push(await processChunk(chunk));
  }
  
  return mergeResults(chunks);
}
```

### 5. 병렬 처리 최적화
```typescript
import pLimit from 'p-limit';

// 동시 처리 제한 (CPU 코어 수에 맞춰)
const limit = pLimit(os.cpus().length);

const analysisPromises = files.map(file => 
  limit(() => analyzeFile(file))
);

const results = await Promise.allSettled(analysisPromises);
```

---

## 🏗️ 아키텍처 개선

### 1. 레이어 분리
```
/src
  /controllers    # API 엔드포인트
  /services      # 비즈니스 로직
  /repositories  # 데이터 접근
  /queues        # 백그라운드 작업
  /utils         # 유틸리티
  /middleware    # 미들웨어
```

### 2. 의존성 주입
```typescript
class FileService {
  constructor(
    private fileRepo: FileRepository,
    private analysisQueue: Queue,
    private cache: Cache
  ) {}
}
```

### 3. 이벤트 기반 아키텍처
```typescript
import { EventEmitter } from 'events';

class FileProcessor extends EventEmitter {
  async processFile(file: File) {
    this.emit('processing.started', { fileId: file.id });
    // 처리 로직
    this.emit('processing.completed', { fileId: file.id, result });
  }
}
```

---

## 🛠️ 개발 환경 개선

### 1. Docker 컨테이너화
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. 개발/프로덕션 분리
```typescript
// config/development.js
export default {
  database: { url: 'sqlite:./dev.db' },
  uploads: { dir: './dev-uploads' },
  ai: { provider: 'mock' } // 개발시 Mock 사용
};

// config/production.js  
export default {
  database: { url: process.env.DATABASE_URL },
  uploads: { dir: process.env.UPLOAD_DIR },
  ai: { provider: 'anthropic' }
};
```

### 3. 로깅 시스템
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

---

## 🔍 모니터링 & 디버깅

### 1. 헬스체크 엔드포인트
```typescript
app.get('/health', async (req, res) => {
  const health = {
    database: await checkDatabase(),
    disk: await checkDiskSpace(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  res.json(health);
});
```

### 2. 메트릭스 수집
```typescript
import prometheus from 'prom-client';

const fileProcessingCounter = new prometheus.Counter({
  name: 'files_processed_total',
  help: 'Total number of files processed',
  labelNames: ['status']
});
```

### 3. 에러 추적
```typescript
import Sentry from '@sentry/node';

// 구조화된 에러 핸들링
class AppError extends Error {
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
```

---

## 📊 예상 성능 개선 효과

| 항목 | 현재 | 개선 후 | 개선율 |
|------|------|---------|---------|
| 파일 안정성 | 60% | 99% | +65% |
| 처리 속도 | 기준 | 3-5x | +200-400% |
| 메모리 사용량 | 기준 | 50-70% | -30-50% |
| 동시 처리 | 1-2개 | 10-20개 | +500-1000% |
| 에러 복구 | 0% | 90% | +90% |

이러한 개선사항들을 단계별로 적용하면 훨씬 안정적이고 성능이 좋은 시스템이 될 것입니다.