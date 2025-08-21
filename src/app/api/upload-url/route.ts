import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload URL API called");
    
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

    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "파일명이 필요합니다." },
        { status: 400 }
      );
    }

    // 임시로 Mock URL 생성 (실제로는 Vercel Blob presigned URL을 생성)
    const timestamp = Date.now();
    const mockUploadUrl = `https://mock-upload.example.com/${timestamp}-${filename}`;
    const mockFileUrl = `https://mock-storage.example.com/${timestamp}-${filename}`;

    return NextResponse.json({
      uploadUrl: mockUploadUrl,
      fileUrl: mockFileUrl,
      message: "업로드 URL 생성 성공 (테스트 모드)"
    });

  } catch (error) {
    console.error("Upload URL generation error:", error);
    return NextResponse.json(
      { error: "업로드 URL 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}