# PPT 맞춤법 검사기

PowerPoint 교재를 자동으로 교정하는 AI 기반 웹 애플리케이션

## 🚀 기능

- 🔐 패스워드 기반 보안 인증
- 📄 PowerPoint(.pptx) 파일 업로드
- 🤖 AI 기반 맞춤법 검사 
- ✏️ 사용자가 수정할 오류를 검토하고 선택
- 📥 ppt를 자동으로 시스템이 수정하고, 수정된 파일 자동 다운로드

## 🛠 기술 스택

- **Frontend**: Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **AI**: Anthropic Claude API
- **Storage**: Vercel Blob
- **Database**: Vercel Postgres
- **Deployment**: Vercel

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 🌟 사용 방법

1. **로그인**: 패스워드를 입력하여 인증
2. **업로드**: PowerPoint 파일 업로드
3. **검토**: AI가 제안한 교정 사항 검토 및 선택
4. **다운로드**: 교정된 파일 자동 다운로드

## 📝 환경 변수

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```
# 인증
AUTH_PASSWORD=your-password

# AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Database
POSTGRES_URL=your-postgres-url
```

## 🚀 배포

Vercel에 자동 배포됩니다:

```bash
vercel
```

## 📄 라이센스

MIT