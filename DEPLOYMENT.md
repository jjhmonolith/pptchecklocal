# PPT 맞춤법 검사기 배포 가이드

## 🚀 배포 준비사항

### 1. 환경 변수 설정

배포 환경에서 다음 환경 변수들을 설정해야 합니다:

```bash
# 필수 환경 변수
AUTH_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key-minimum-32-characters
ANTHROPIC_API_KEY=your-anthropic-api-key

# 선택적 환경 변수 (파일 저장용)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### 2. Vercel 배포

#### 2.1 준비 단계
```bash
npm install -g vercel
vercel login
```

#### 2.2 배포 실행
```bash
vercel --prod
```

#### 2.3 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수 설정:
- `AUTH_PASSWORD`: 애플리케이션 접근 비밀번호
- `JWT_SECRET`: JWT 토큰 서명용 비밀 키 (최소 32자)
- `ANTHROPIC_API_KEY`: Claude API 키

### 3. 다른 플랫폼 배포

#### 3.1 Netlify
1. GitHub 리포지토리를 Netlify에 연결
2. Build command: `npm run build`
3. Publish directory: `.next`
4. 환경 변수 설정

#### 3.2 Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🔧 로컬 개발 환경

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd ppt-spell-checker
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```bash
AUTH_PASSWORD=ppt-checker-2024
JWT_SECRET=ppt-spell-checker-secret-key-2024-super-secure
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 3. 개발 서버 실행
```bash
npm run dev
```

## 📋 테스트 체크리스트

- [ ] 홈페이지 로딩 확인
- [ ] 인증 시스템 작동 확인
- [ ] 파일 업로드 기능 테스트
- [ ] AI 맞춤법 분석 기능 테스트  
- [ ] 교정 사항 리뷰 기능 테스트
- [ ] 교정 적용 및 다운로드 기능 테스트
- [ ] 반응형 디자인 확인
- [ ] 다양한 브라우저 호환성 확인

## 🔒 보안 고려사항

1. **JWT Secret**: 충분히 강력하고 긴 비밀키 사용
2. **API Key**: Anthropic API 키를 안전하게 관리
3. **파일 임시 저장**: 30분 후 자동 삭제 구현됨
4. **인증**: 모든 API 엔드포인트에 JWT 인증 적용

## 📊 성능 최적화

- Next.js 15 Turbopack 사용으로 빠른 빌드
- 정적 페이지 사전 렌더링
- 파일 업로드 청크 처리
- 메모리 기반 임시 파일 저장

## 🐛 문제 해결

### 일반적인 오류

1. **JWT 토큰 오류**
   - JWT_SECRET 환경 변수 확인
   - 토큰 만료 시간 확인

2. **파일 업로드 오류**  
   - 파일 크기 제한 확인 (기본 10MB)
   - 지원되는 파일 형식 확인 (.pptx만 지원)

3. **AI 분석 오류**
   - ANTHROPIC_API_KEY 확인
   - API 사용량 제한 확인

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 브라우저 콘솔 오류 메시지
2. 서버 로그 확인
3. 환경 변수 설정 재확인