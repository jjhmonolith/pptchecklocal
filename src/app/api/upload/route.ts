import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024";

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

    // 파일 크기 검증 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 최대 50MB까지 가능합니다." },
        { status: 400 }
      );
    }

    // 파일명 생성 (타임스탬프 + 원본명)
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;

    // Vercel Blob에 업로드
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({
      message: "파일 업로드 성공",
      url: blob.url,
      filename: filename,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}