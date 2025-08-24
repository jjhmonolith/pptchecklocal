import { NextRequest, NextResponse } from "next/server";
import { FileStorage } from "@/lib/file-storage";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    const fileData = await FileStorage.get(id);
    
    // 디버깅 정보 추가
    console.log(`파일 조회 시도: ${id}`);
    console.log(`저장된 파일 수: ${FileStorage.size()}`);
    
    if (!fileData) {
      // 파일이 없을 때 더 자세한 정보 제공
      console.log(`파일을 찾을 수 없음: ${id}, 저장소 상태:`, {
        storageSize: FileStorage.size(),
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { 
          error: "파일을 찾을 수 없습니다. 파일이 만료되었거나 서버가 재시작되었을 수 있습니다.",
          debug: {
            fileId: id,
            storageSize: FileStorage.size(),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // 파일 읽기
    const buffer = await FileStorage.readFile(id);
    
    if (!buffer) {
      return NextResponse.json(
        { error: "파일을 읽을 수 없습니다." },
        { status: 500 }
      );
    }

    // 파일 응답 반환
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { error: "파일 서빙 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}