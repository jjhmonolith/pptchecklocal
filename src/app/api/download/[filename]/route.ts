import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

// Global 타입 확장
declare global {
  var tempFiles: Map<string, ArrayBuffer> | undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    console.log("Download API called:", filename);
    
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

    // 임시 저장소에서 파일 가져오기
    const tempFiles = global.tempFiles as Map<string, ArrayBuffer> | undefined;
    const fileName = decodeURIComponent(filename);
    
    if (!tempFiles || !tempFiles.has(fileName)) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없거나 만료되었습니다." },
        { status: 404 }
      );
    }
    
    const fileBuffer = tempFiles.get(fileName)!;
    console.log(`파일 다운로드 제공: ${fileName} (${fileBuffer.byteLength} bytes)`);
    
    // PPTX 파일로 응답
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}