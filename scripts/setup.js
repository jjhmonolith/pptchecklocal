#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

console.log('🚀 PPT 맞춤법 검사기 설정을 시작합니다...');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 안전한 패스워드 생성
function generateSecurePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// JWT 시크릿 생성
function generateJwtSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// 질문 함수
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// 디렉토리 생성
function ensureDirectories() {
  const dirs = ['uploads', 'temp', 'processed', 'chunks', 'logs'];
  
  console.log('📁 필요한 디렉토리를 생성합니다...');
  
  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ ${dir}/ 디렉토리 생성됨`);
    } else {
      console.log(`   ℹ️  ${dir}/ 디렉토리 이미 존재함`);
    }
  });
  console.log('');
}

// .gitignore 업데이트
function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const additionalEntries = [
    '# PPT 처리 파일들',
    'uploads/',
    'temp/',
    'processed/',
    'chunks/',
    'logs/',
    'file-metadata.json',
    '*.pptx',
    '',
    '# 환경변수',
    '.env.local',
    '',
    '# 시스템 파일',
    '.DS_Store',
    'Thumbs.db'
  ];
  
  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  // 이미 추가된 항목들 확인
  const missingEntries = additionalEntries.filter(entry => {
    return entry && !gitignoreContent.includes(entry);
  });
  
  if (missingEntries.length > 0) {
    console.log('📝 .gitignore 파일을 업데이트합니다...');
    gitignoreContent += '\\n' + missingEntries.join('\\n') + '\\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('   ✅ .gitignore 업데이트 완료');
  } else {
    console.log('   ℹ️  .gitignore 이미 최신 상태');
  }
  console.log('');
}

// 환경변수 설정
async function setupEnvironmentVariables() {
  console.log('⚙️  환경변수를 설정합니다...');
  
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envLocalPath)) {
    console.log('   ⚠️  .env.local 파일이 이미 존재합니다.');
    const overwrite = await question('   덮어쓰시겠습니까? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('   ℹ️  환경변수 설정을 건너뜁니다.');
      console.log('');
      return;
    }
  }
  
  console.log('');
  console.log('🔐 보안 설정을 구성합니다...');
  
  // 패스워드 설정
  let authPassword;
  const useRandomPassword = await question('   자동으로 안전한 패스워드를 생성하시겠습니까? (Y/n): ');
  
  if (useRandomPassword.toLowerCase() === 'n') {
    do {
      authPassword = await question('   로그인 패스워드를 입력하세요 (최소 6자): ');
      if (authPassword.length < 6) {
        console.log('   ❌ 패스워드는 최소 6자 이상이어야 합니다.');
      }
    } while (authPassword.length < 6);
  } else {
    authPassword = generateSecurePassword(12);
    console.log(`   ✅ 생성된 패스워드: ${authPassword}`);
    console.log('   ⚠️  이 패스워드를 안전한 곳에 보관하세요!');
  }
  
  const jwtSecret = generateJwtSecret();
  
  console.log('');
  console.log('🤖 AI API 설정 (선택사항)...');
  const anthropicKey = await question('   Anthropic API 키 (Claude) [선택사항]: ');
  const openaiKey = await question('   OpenAI API 키 (GPT) [선택사항]: ');
  
  console.log('');
  console.log('🌐 Cloudflare 설정 (선택사항)...');
  const tunnelToken = await question('   Cloudflare Tunnel 토큰 [선택사항]: ');
  const domain = await question('   도메인 주소 [선택사항]: ');
  
  // .env.local 파일 생성
  const envContent = `# PPT 맞춤법 검사기 환경변수 설정
# 자동 생성일시: ${new Date().toISOString()}

# === 필수 설정 ===
AUTH_PASSWORD=${authPassword}
JWT_SECRET=${jwtSecret}

# === 서버 설정 ===
PORT=3333
NODE_ENV=development
NEXTJS_URL=http://localhost:3333

# === 파일 처리 설정 ===
MAX_FILE_SIZE=50MB
CLEANUP_INTERVAL=24h
UPLOAD_TIMEOUT=30s

# === AI API 설정 (선택사항) ===
${anthropicKey ? `ANTHROPIC_API_KEY=${anthropicKey}` : '# ANTHROPIC_API_KEY=your-anthropic-api-key'}
${openaiKey ? `OPENAI_API_KEY=${openaiKey}` : '# OPENAI_API_KEY=your-openai-api-key'}

# === Cloudflare 설정 (선택사항) ===
${tunnelToken ? `CLOUDFLARE_TUNNEL_TOKEN=${tunnelToken}` : '# CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token'}
${domain ? `CLOUDFLARE_DOMAIN=${domain}` : '# CLOUDFLARE_DOMAIN=your-domain.com'}

# === 로깅 설정 ===
LOG_LEVEL=info
LOG_FILE=logs/app.log
`;
  
  fs.writeFileSync(envLocalPath, envContent);
  console.log('   ✅ .env.local 파일이 생성되었습니다.');
  console.log('');
}

// 패키지 의존성 체크
function checkDependencies() {
  console.log('📦 패키지 의존성을 확인합니다...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('   ❌ package.json 파일을 찾을 수 없습니다.');
    return false;
  }
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('   ⚠️  node_modules가 없습니다. npm install을 실행하세요.');
    return false;
  }
  
  console.log('   ✅ 패키지 의존성 확인 완료');
  return true;
}

// README 업데이트
function updateReadme() {
  console.log('📚 README 파일을 업데이트합니다...');
  
  const readmePath = path.join(process.cwd(), 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    console.log('   ⚠️  README.md 파일이 없습니다. 새로 생성합니다.');
  }
  
  const readmeContent = `# PPT 맞춤법 검사기 (로컬 버전)

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
\`\`\`bash
git clone https://github.com/jjhmonolith/pptchecklocal.git
cd pptchecklocal
\`\`\`

### 2. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 3. 초기 설정
\`\`\`bash
npm run setup
\`\`\`

### 4. 서버 실행
\`\`\`bash
npm run dev
\`\`\`

서버가 http://localhost:3333 에서 실행됩니다.

## 🔧 수동 설정

\`npm run setup\`을 사용하지 않고 수동으로 설정하려면:

1. \`.env.example\`을 \`.env.local\`로 복사
2. 환경변수 값들을 적절히 설정
3. 필요한 디렉토리들 생성: \`uploads/\`, \`temp/\`, \`processed/\`, \`chunks/\`, \`logs/\`

## 📋 환경변수

### 필수 설정
- \`AUTH_PASSWORD\`: 웹 애플리케이션 접근 패스워드
- \`JWT_SECRET\`: JWT 토큰 서명용 비밀키 (최소 32자)

### 선택적 설정
- \`ANTHROPIC_API_KEY\`: Claude AI API 키
- \`OPENAI_API_KEY\`: OpenAI GPT API 키
- \`CLOUDFLARE_TUNNEL_TOKEN\`: Cloudflare 터널 토큰
- \`CLOUDFLARE_DOMAIN\`: 사용할 도메인 주소

## 🌐 Cloudflare 터널 설정

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) 로그인
2. Access > Tunnels > Create a tunnel
3. 터널 이름 입력 후 토큰 복사
4. \`.env.local\`에 토큰 설정:
   \`\`\`
   CLOUDFLARE_TUNNEL_TOKEN=your_token_here
   CLOUDFLARE_DOMAIN=your-domain.com
   \`\`\`
5. 터널 실행 (별도 터미널):
   \`\`\`bash
   cloudflared tunnel run --token your_token_here
   \`\`\`

## 📁 디렉토리 구조

\`\`\`
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
\`\`\`

## 🛠 유용한 명령어

- \`npm run dev\`: 개발 서버 실행 (포트 3333)
- \`npm run build\`: 프로덕션 빌드
- \`npm run start\`: 프로덕션 서버 실행
- \`npm run setup\`: 초기 설정 스크립트
- \`npm run cleanup\`: 임시 파일 정리

## 🔍 문제 해결

### 파일 업로드 실패
- 파일 크기가 50MB를 초과하지 않는지 확인
- \`uploads/\` 디렉토리 권한 확인
- 디스크 공간 확인

### AI 분석 실패
- API 키가 올바르게 설정되었는지 확인
- 네트워크 연결 상태 확인
- API 사용량 한도 확인

### 포트 충돌
- \`.env.local\`에서 \`PORT\` 값을 다른 포트로 변경
- 또는 \`PORT=다른포트 npm run dev\` 실행

## 📝 라이선스

MIT License

---

💡 문제가 있으시면 GitHub Issues에 등록해 주세요.
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('   ✅ README.md 파일 업데이트 완료');
  console.log('');
}

// 메인 설정 함수
async function main() {
  try {
    // 현재 디렉토리 체크
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json을 찾을 수 없습니다.');
      console.log('PPT 맞춤법 검사기 프로젝트 루트 디렉토리에서 실행해주세요.');
      process.exit(1);
    }
    
    console.log('🏠 프로젝트 루트 디렉토리 확인 완료');
    console.log('');
    
    // 단계별 설정 실행
    ensureDirectories();
    updateGitignore();
    await setupEnvironmentVariables();
    updateReadme();
    checkDependencies();
    
    // 완료 메시지
    console.log('🎉 설정이 완료되었습니다!');
    console.log('');
    console.log('다음 단계:');
    console.log('1. 의존성이 설치되지 않았다면: npm install');
    console.log('2. 개발 서버 실행: npm run dev');
    console.log('3. 브라우저에서 http://localhost:3333 접속');
    console.log('');
    console.log('🔐 로그인 패스워드를 기억해 두세요!');
    console.log('📄 .env.local 파일에서 설정을 변경할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 설정 중 오류가 발생했습니다:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}