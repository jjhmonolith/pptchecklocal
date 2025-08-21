import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { getConfigStatus, reloadConfig } from "@/lib/config";
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

// 설정 상태 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    try {
      verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const configStatus = getConfigStatus();
    
    // .env.local 파일 존재 여부 확인
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envLocalExists = fs.existsSync(envLocalPath);
    
    // .env.example 파일 내용 조회
    const envExamplePath = path.join(process.cwd(), '.env.example');
    let envExampleContent = '';
    try {
      envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    } catch {
      envExampleContent = '# .env.example 파일이 없습니다.';
    }

    return NextResponse.json({
      ...configStatus,
      files: {
        envLocalExists,
        envExampleContent
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Config API error:", error);
    return NextResponse.json(
      { 
        error: "설정 조회 중 오류가 발생했습니다.",
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 설정 업데이트
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    try {
      verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const { action, config } = await request.json();

    switch (action) {
      case 'create_env_local':
        // .env.local 파일 생성
        const envLocalPath = path.join(process.cwd(), '.env.local');
        const envExamplePath = path.join(process.cwd(), '.env.example');
        
        if (fs.existsSync(envLocalPath)) {
          return NextResponse.json(
            { error: ".env.local 파일이 이미 존재합니다." },
            { status: 400 }
          );
        }
        
        let templateContent = '';
        if (fs.existsSync(envExamplePath)) {
          templateContent = fs.readFileSync(envExamplePath, 'utf8');
        } else {
          templateContent = `# PPT 맞춤법 검사기 환경변수 설정
AUTH_PASSWORD=change-this-password
JWT_SECRET=change-this-super-secure-jwt-secret-key-minimum-32-chars
PORT=3333
NODE_ENV=development`;
        }
        
        fs.writeFileSync(envLocalPath, templateContent);
        
        return NextResponse.json({
          success: true,
          message: ".env.local 파일이 생성되었습니다."
        });

      case 'update_env':
        // 환경변수 업데이트 (런타임에서는 제한적)
        if (!config) {
          return NextResponse.json(
            { error: "설정 데이터가 필요합니다." },
            { status: 400 }
          );
        }
        
        // 현재 프로세스의 env 업데이트 (재시작 필요)
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        });
        
        // 설정 리로드
        try {
          reloadConfig();
          return NextResponse.json({
            success: true,
            message: "설정이 업데이트되었습니다. 서버 재시작이 권장됩니다.",
            configStatus: getConfigStatus()
          });
        } catch (configError) {
          return NextResponse.json(
            { 
              error: "설정 검증 실패",
              details: configError instanceof Error ? configError.message : String(configError)
            },
            { status: 400 }
          );
        }

      case 'reload':
        // 설정 리로드
        try {
          reloadConfig();
          return NextResponse.json({
            success: true,
            message: "설정이 리로드되었습니다.",
            configStatus: getConfigStatus()
          });
        } catch (configError) {
          return NextResponse.json(
            { 
              error: "설정 리로드 실패",
              details: configError instanceof Error ? configError.message : String(configError)
            },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { error: `지원하지 않는 액션: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Config update error:", error);
    return NextResponse.json(
      { 
        error: "설정 업데이트 중 오류가 발생했습니다.",
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}