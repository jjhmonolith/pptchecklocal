import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";
const FALLBACK_JWT_SECRET = "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload file API called");
    
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
    } catch (error) {
      console.log("Primary JWT verification failed, trying fallback");
      try {
        verify(token, FALLBACK_JWT_SECRET);
        console.log("Fallback JWT verification successful");
      } catch (fallbackError) {
        console.error("Both JWT verifications failed:", error, fallbackError);
        console.log("Token:", token?.substring(0, 20) + "...");
        console.log("JWT_SECRET exists:", !!JWT_SECRET);
        return NextResponse.json(
          { error: "유효하지 않은 토큰입니다. 다시 로그인해주세요." },
          { status: 401 }
        );
      }
    }

    // multipart/form-data로 파일 받기
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!file.name.endsWith('.pptx') && file.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return NextResponse.json(
        { error: "PowerPoint (.pptx) 파일만 지원됩니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 25MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일을 base64로 인코딩하여 임시 저장
    const base64Data = buffer.toString('base64');
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // 파일 데이터를 메모리에 저장
    const fileData = {
      id: fileId,
      filename: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
      status: 'complete' as const
    };

    // 파일 저장소에 저장
    const { FileStorage } = await import("@/lib/file-storage");
    await FileStorage.store(fileData, Buffer.from(base64Data, 'base64'));

    // 파일 URL 생성
    const fileUrl = `${process.env.NEXTJS_URL || request.nextUrl.origin}/api/file/${fileId}`;

    console.log(`파일 업로드 완료: ${file.name}, 크기: ${file.size} bytes`);

    return NextResponse.json({
      success: true,
      fileId,
      fileUrl,
      filename: file.name,
      size: file.size,
      message: "파일 업로드가 완료되었습니다."
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "POST 메소드를 사용하여 파일을 업로드하세요." 
  });
}