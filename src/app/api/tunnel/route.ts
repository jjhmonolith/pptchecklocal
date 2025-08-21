import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

// 터널 상태 조회
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

    // Cloudflare 설정 확인
    const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    const domain = process.env.CLOUDFLARE_DOMAIN;

    // cloudflared 설치 확인
    let cloudflaredInstalled = false;
    let cloudflaredVersion = '';
    try {
      const { stdout } = await execAsync('cloudflared --version');
      cloudflaredInstalled = true;
      cloudflaredVersion = stdout.split('\n')[0].split(' ')[2] || 'unknown';
    } catch {
      cloudflaredInstalled = false;
    }

    // 터널 프로세스 확인
    let tunnelRunning = false;
    let tunnelPids: string[] = [];
    try {
      const { stdout } = await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
      tunnelPids = stdout.trim().split('\n').filter(pid => pid);
      tunnelRunning = tunnelPids.length > 0;
    } catch {
      tunnelRunning = false;
    }

    // 터널 로그 확인
    const logPath = path.join(process.cwd(), 'tunnel.log');
    let logExists = false;
    let logSize = 0;
    let recentLogs: string[] = [];
    
    try {
      const stat = fs.statSync(logPath);
      logExists = true;
      logSize = stat.size;
      
      // 최근 10줄 로그 읽기
      const { stdout } = await execAsync(`tail -n 10 "${logPath}"`);
      recentLogs = stdout.split('\n').filter(line => line.trim());
    } catch {
      // 로그 파일 없음
    }

    // 시스템 정보
    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get('includeSystem') === 'true';
    
    let systemInfo = {};
    if (includeSystem) {
      try {
        // 네트워크 인터페이스 정보
        const { stdout: ifconfigOut } = await execAsync('ifconfig 2>/dev/null || ip addr show 2>/dev/null || echo "network info unavailable"');
        
        systemInfo = {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          networkInfo: ifconfigOut.substring(0, 500) // 처음 500자만
        };
      } catch {
        systemInfo = {
          platform: process.platform,
          arch: process.arch,  
          nodeVersion: process.version
        };
      }
    }

    const response = {
      status: {
        configured: !!tunnelToken,
        cloudflaredInstalled,
        tunnelRunning,
        accessible: tunnelRunning && !!domain
      },
      config: {
        tokenSet: !!tunnelToken,
        token: tunnelToken ? `${tunnelToken.substring(0, 20)}...` : null,
        domain: domain || null
      },
      process: {
        running: tunnelRunning,
        pids: tunnelPids,
        count: tunnelPids.length
      },
      cloudflared: {
        installed: cloudflaredInstalled,
        version: cloudflaredVersion
      },
      logs: {
        exists: logExists,
        size: logSize,
        sizeFormatted: logSize > 0 ? `${Math.round(logSize / 1024)}KB` : '0B',
        recent: recentLogs
      },
      urls: {
        local: `http://localhost:${process.env.PORT || 3333}`,
        tunnel: domain ? `https://${domain}` : null
      },
      ...(includeSystem && { system: systemInfo }),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Tunnel status API error:", error);
    return NextResponse.json(
      { 
        error: "터널 상태 조회 중 오류가 발생했습니다.",
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 터널 제어
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

    const { action } = await request.json();

    switch (action) {
      case 'start':
        // 터널 시작
        const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
        if (!tunnelToken) {
          return NextResponse.json(
            { error: "CLOUDFLARE_TUNNEL_TOKEN이 설정되지 않았습니다." },
            { status: 400 }
          );
        }

        // 이미 실행 중인지 확인
        try {
          await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
          return NextResponse.json(
            { error: "터널이 이미 실행 중입니다." },
            { status: 400 }
          );
        } catch {
          // 실행 중이지 않음, 계속 진행
        }

        try {
          // 백그라운드에서 터널 시작
          const logPath = path.join(process.cwd(), 'tunnel.log');
          exec(`nohup cloudflared tunnel run --token "${tunnelToken}" > "${logPath}" 2>&1 &`);
          
          // 잠시 대기 후 프로세스 확인
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            const { stdout } = await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            if (pids.length > 0) {
              return NextResponse.json({
                success: true,
                message: "터널이 시작되었습니다.",
                pids: pids
              });
            } else {
              throw new Error("터널 프로세스를 찾을 수 없습니다.");
            }
          } catch (error) {
            return NextResponse.json(
              { 
                error: "터널 시작에 실패했습니다.",
                details: error instanceof Error ? error.message : String(error)
              },
              { status: 500 }
            );
          }
        } catch (error) {
          return NextResponse.json(
            { 
              error: "터널 시작 명령 실행에 실패했습니다.",
              details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
          );
        }

      case 'stop':
        // 터널 중지
        try {
          const { stdout } = await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
          const pids = stdout.trim().split('\n').filter(pid => pid);
          
          if (pids.length === 0) {
            return NextResponse.json({
              success: true,
              message: "실행 중인 터널이 없습니다."
            });
          }
          
          // 모든 터널 프로세스 종료
          for (const pid of pids) {
            try {
              await execAsync(`kill ${pid}`);
            } catch {
              // 강제 종료 시도
              try {
                await execAsync(`kill -9 ${pid}`);
              } catch {
                // 프로세스가 이미 종료되었을 수 있음
              }
            }
          }
          
          return NextResponse.json({
            success: true,
            message: `${pids.length}개의 터널 프로세스가 종료되었습니다.`,
            terminatedPids: pids
          });
          
        } catch (error) {
          return NextResponse.json({
            success: true,
            message: "종료할 터널 프로세스가 없습니다."
          });
        }

      case 'restart':
        // 터널 재시작 (중지 후 시작)
        try {
          // 먼저 중지
          try {
            const { stdout } = await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            for (const pid of pids) {
              try {
                await execAsync(`kill ${pid}`);
              } catch {
                await execAsync(`kill -9 ${pid}`).catch(() => {});
              }
            }
          } catch {
            // 실행 중인 프로세스 없음
          }
          
          // 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 다시 시작
          const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
          if (!tunnelToken) {
            return NextResponse.json(
              { error: "CLOUDFLARE_TUNNEL_TOKEN이 설정되지 않았습니다." },
              { status: 400 }
            );
          }
          
          const logPath = path.join(process.cwd(), 'tunnel.log');
          exec(`nohup cloudflared tunnel run --token "${tunnelToken}" > "${logPath}" 2>&1 &`);
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { stdout } = await execAsync('pgrep -f "cloudflared.*tunnel.*run"');
          const newPids = stdout.trim().split('\n').filter(pid => pid);
          
          if (newPids.length > 0) {
            return NextResponse.json({
              success: true,
              message: "터널이 재시작되었습니다.",
              pids: newPids
            });
          } else {
            return NextResponse.json(
              { error: "터널 재시작에 실패했습니다." },
              { status: 500 }
            );
          }
          
        } catch (error) {
          return NextResponse.json(
            { 
              error: "터널 재시작 중 오류가 발생했습니다.",
              details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
          );
        }

      case 'logs':
        // 로그 조회
        const logPath = path.join(process.cwd(), 'tunnel.log');
        
        try {
          const { lines = 50 } = await request.json();
          const { stdout } = await execAsync(`tail -n ${Math.min(lines, 1000)} "${logPath}"`);
          
          return NextResponse.json({
            success: true,
            logs: stdout.split('\n'),
            path: logPath
          });
        } catch (error) {
          return NextResponse.json(
            { 
              error: "로그 파일을 읽을 수 없습니다.",
              details: error instanceof Error ? error.message : String(error)
            },
            { status: 404 }
          );
        }

      default:
        return NextResponse.json(
          { error: `지원하지 않는 액션: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Tunnel control API error:", error);
    return NextResponse.json(
      { 
        error: "터널 제어 중 오류가 발생했습니다.",
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}