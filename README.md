# PPT 맞춤법 검사기 (로컬 버전)

PowerPoint 파일의 맞춤법과 문법을 AI로 자동 검사하고 수정하는 로컬 웹 애플리케이션

## ✨ 주요 기능

- 🔐 패스워드 기반 보안 인증
- 📄 대용량 PowerPoint 파일 업로드 (최대 50MB)
- 🤖 AI 기반 맞춤법 및 문법 검사
- ✏️ 사용자가 검토하고 선택할 수 있는 교정 제안
- 📥 교정된 파일 자동 다운로드
- 🚀 파일시스템 기반 안정적 처리
- 🌐 Cloudflare 터널 지원

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/jjhmonolith/pptchecklocal.git
cd pptchecklocal
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 초기 설정
```bash
npm run setup
```

### 4. 서버 실행
```bash
npm run dev
```

서버가 http://localhost:3333 에서 실행됩니다.

## 🔧 수동 설정

`npm run setup`을 사용하지 않고 수동으로 설정하려면:

1. `.env.example`을 `.env.local`로 복사
2. 환경변수 값들을 적절히 설정
3. 필요한 디렉토리들 생성: `uploads/`, `temp/`, `processed/`, `chunks/`, `logs/`

## 📋 환경변수

### 필수 설정
- `AUTH_PASSWORD`: 웹 애플리케이션 접근 패스워드
- `JWT_SECRET`: JWT 토큰 서명용 비밀키 (최소 32자)

### 선택적 설정
- `ANTHROPIC_API_KEY`: Claude AI API 키
- `OPENAI_API_KEY`: OpenAI GPT API 키
- `CLOUDFLARE_TUNNEL_TOKEN`: Cloudflare 터널 토큰
- `CLOUDFLARE_DOMAIN`: 사용할 도메인 주소

## 🌐 Cloudflare 터널 설정

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) 로그인
2. Access > Tunnels > Create a tunnel
3. 터널 이름 입력 후 토큰 복사
4. `.env.local`에 토큰 설정:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=your_token_here
   CLOUDFLARE_DOMAIN=your-domain.com
   ```
5. 터널 실행 (별도 터미널):
   ```bash
   cloudflared tunnel run --token your_token_here
   ```

## 📁 디렉토리 구조

```
pptchecklocal/
├── uploads/          # 업로드된 원본 파일
├── processed/        # 교정된 파일
├── temp/            # 임시 파일
├── chunks/          # 업로드 청크들
├── logs/            # 로그 파일
├── src/
│   ├── app/         # Next.js 페이지 및 API
│   ├── components/  # React 컴포넌트
│   └── lib/         # 유틸리티 및 라이브러리
├── scripts/         # 설정 스크립트들
└── .env.local       # 환경변수 설정
```

## 🛠 유용한 명령어

- `npm run dev`: 개발 서버 실행 (포트 3333)
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 실행
- `npm run setup`: 초기 설정 스크립트
- `npm run cleanup`: 임시 파일 정리

## 🔍 문제 해결

### 파일 업로드 실패
- 파일 크기가 50MB를 초과하지 않는지 확인
- `uploads/` 디렉토리 권한 확인
- 디스크 공간 확인

### AI 분석 실패
- API 키가 올바르게 설정되었는지 확인
- 네트워크 연결 상태 확인
- API 사용량 한도 확인

### 포트 충돌
- `.env.local`에서 `PORT` 값을 다른 포트로 변경
- 또는 `PORT=다른포트 npm run dev` 실행

## 📝 라이선스

MIT License

---

💡 문제가 있으시면 GitHub Issues에 등록해 주세요.
