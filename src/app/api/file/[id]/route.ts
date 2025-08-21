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
    
    const fileData = FileStorage.get(id);
    
    if (!fileData) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // base64 데이터를 Buffer로 변환
    const buffer = Buffer.from(fileData.data, 'base64');

    // 파일 응답 반환
    return new NextResponse(buffer, {
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