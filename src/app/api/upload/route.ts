import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

// 파일 업로드 크기 제한 설정 (50MB)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    console.log("Upload API called");
    
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value;

    console.log("Token check:", { hasAuthHeader: !!authHeader, hasToken: !!token });

    if (!token) {
      console.log("No token provided");
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    try {
      verify(token, JWT_SECRET);
      console.log("Token verification successful");
    } catch (error) {
      console.log("Token verification failed:", error);
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 파일 형식 검증
    if (!file.name.endsWith('.pptx') && file.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return NextResponse.json(
        { error: "PowerPoint(.pptx) 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    console.log("File info:", { name: file.name, size: file.size, type: file.type });

    // 파일 크기 검증 (25MB로 조정 - Vercel 제한 고려)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 최대 25MB까지 가능합니다." },
        { status: 400 }
      );
    }

    // 임시로 파일 정보만 반환 (실제 저장 없이 테스트용)
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    
    // 임시 URL 생성 (실제로는 저장되지 않음)
    const mockUrl = `https://mock-storage.example.com/${filename}`;

    return NextResponse.json({
      message: "파일 업로드 성공 (테스트 모드)",
      url: mockUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      note: "Vercel Blob 설정 전 임시 모드입니다."
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}