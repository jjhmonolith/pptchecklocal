/**
 * 환경변수 관리 및 설정 검증
 */

interface AppConfig {
  // 필수 설정
  auth: {
    password: string;
    jwtSecret: string;
  };
  
  // 서버 설정
  server: {
    port: number;
    nodeEnv: string;
    baseUrl: string;
  };
  
  // AI API 설정
  ai: {
    anthropicApiKey?: string;
    openaiApiKey?: string;
  };
  
  // 파일 처리 설정
  files: {
    maxSize: number;
    cleanupInterval: number;
    uploadTimeout: number;
  };
  
  // Cloudflare 설정
  cloudflare?: {
    tunnelToken?: string;
    domain?: string;
  };
  
  // 로깅 설정
  logging: {
    level: string;
    file?: string;
  };
}

// 기본값 (현재 사용되지 않음 - 환경변수로 직접 설정)
// const defaultConfig: Partial<AppConfig> = {
//   server: {
//     port: 3333,
//     nodeEnv: 'development',
//     baseUrl: 'http://localhost:3333'
//   },
//   files: {
//     maxSize: 50 * 1024 * 1024, // 50MB
//     cleanupInterval: 24 * 60 * 60 * 1000, // 24시간
//     uploadTimeout: 30 * 1000 // 30초
//   },
//   logging: {
//     level: 'info'
//   }
// };

// 환경변수 파싱 유틸리티
const parseSize = (sizeStr: string): number => {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)(MB|GB|KB)?$/i);
  if (!match) throw new Error(`잘못된 크기 형식: ${sizeStr}`);
  
  const size = parseFloat(match[1]);
  const unit = (match[2] || 'B').toLowerCase();
  
  const multipliers = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  return size * multipliers[unit as keyof typeof multipliers];
};

const parseTime = (timeStr: string): number => {
  const match = timeStr.match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) throw new Error(`잘못된 시간 형식: ${timeStr}`);
  
  const time = parseInt(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return time * multipliers[unit as keyof typeof multipliers];
};

// 환경변수 로드 및 검증
export const loadConfig = (): AppConfig => {
  const config: AppConfig = {
    auth: {
      password: process.env.AUTH_PASSWORD || '',
      jwtSecret: process.env.JWT_SECRET || 'ppt-spell-checker-secret-key-2024-super-secure'
    },
    server: {
      port: parseInt(process.env.PORT || '3333'),
      nodeEnv: process.env.NODE_ENV || 'development',
      baseUrl: process.env.NEXTJS_URL || `http://localhost:${process.env.PORT || '3333'}`
    },
    ai: {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY
    },
    files: {
      maxSize: process.env.MAX_FILE_SIZE ? parseSize(process.env.MAX_FILE_SIZE) : 50 * 1024 * 1024,
      cleanupInterval: process.env.CLEANUP_INTERVAL ? parseTime(process.env.CLEANUP_INTERVAL) : 24 * 60 * 60 * 1000,
      uploadTimeout: process.env.UPLOAD_TIMEOUT ? parseTime(process.env.UPLOAD_TIMEOUT) : 30 * 1000
    },
    cloudflare: {
      tunnelToken: process.env.CLOUDFLARE_TUNNEL_TOKEN,
      domain: process.env.CLOUDFLARE_DOMAIN
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE
    }
  };
  
  // 필수 설정 검증
  const errors: string[] = [];
  
  if (!config.auth.password) {
    errors.push('AUTH_PASSWORD 환경변수가 필요합니다.');
  }
  
  if (config.auth.password && config.auth.password.length < 6) {
    errors.push('AUTH_PASSWORD는 최소 6자 이상이어야 합니다.');
  }
  
  if (config.auth.jwtSecret.length < 32) {
    errors.push('JWT_SECRET은 최소 32자 이상의 안전한 키여야 합니다.');
  }
  
  if (config.server.port < 1000 || config.server.port > 65535) {
    errors.push('PORT는 1000-65535 범위여야 합니다.');
  }
  
  if (config.files.maxSize > 100 * 1024 * 1024) {
    errors.push('MAX_FILE_SIZE는 100MB를 초과할 수 없습니다.');
  }
  
  if (errors.length > 0) {
    console.error('환경변수 설정 오류:');
    errors.forEach(error => console.error(`- ${error}`));
    console.error('\\n.env.local 파일을 확인하고 올바른 값을 설정해주세요.');
    throw new Error(`환경변수 설정 오류: ${errors.length}개의 문제가 발견되었습니다.`);
  }
  
  return config;
};

// 설정 상태 확인
export const getConfigStatus = () => {
  try {
    const config = loadConfig();
    return {
      valid: true,
      config: {
        auth: {
          passwordSet: !!config.auth.password,
          jwtSecretSet: !!config.auth.jwtSecret
        },
        server: {
          port: config.server.port,
          nodeEnv: config.server.nodeEnv
        },
        ai: {
          anthropicApiKey: !!config.ai.anthropicApiKey,
          openaiApiKey: !!config.ai.openaiApiKey
        },
        files: {
          maxSizeMB: Math.round(config.files.maxSize / 1024 / 1024),
          cleanupIntervalHours: Math.round(config.files.cleanupInterval / (60 * 60 * 1000)),
          uploadTimeoutSeconds: Math.round(config.files.uploadTimeout / 1000)
        },
        cloudflare: {
          tunnelTokenSet: !!config.cloudflare?.tunnelToken,
          domainSet: !!config.cloudflare?.domain
        }
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
};

// 전역 설정 인스턴스
let globalConfig: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (!globalConfig) {
    globalConfig = loadConfig();
  }
  return globalConfig;
};

// 설정 리로드
export const reloadConfig = (): AppConfig => {
  globalConfig = loadConfig();
  return globalConfig;
};