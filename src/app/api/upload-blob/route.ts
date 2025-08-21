import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { put } from '@vercel/blob';

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload blob API called");
    
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
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
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

    // 파일 크기 검증 (4MB 제한 - Vercel 제한)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 4MB를 초과할 수 없습니다. (Vercel 플랫폼 제한)" },
        { status: 400 }
      );
    }

    try {
      // Vercel Blob에 파일 업로드
      const timestamp = Date.now();
      const filename = `pptx_${timestamp}_${file.name}`;
      
      const blob = await put(filename, file, {
        access: 'public',
        // 1시간 후 자동 삭제 설정은 별도 구현 필요
      });

      console.log(`파일 Blob 업로드 완료: ${file.name}, 크기: ${file.size} bytes`);
      console.log(`Blob URL: ${blob.url}`);

      // 1시간 후 파일 삭제 예약 (별도 cleanup 함수에서 처리)
      // scheduleFileCleanup(blob.url, filename);

      return NextResponse.json({
        success: true,
        fileId: filename,
        fileUrl: blob.url,
        filename: file.name,
        size: file.size,
        message: "파일 업로드가 완료되었습니다."
      });

    } catch (blobError) {
      console.error("Vercel Blob upload error:", blobError);
      
      // Blob 업로드 실패 시 메모리 저장소로 fallback
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      const fileData = {
        id: fileId,
        filename: file.name,
        size: file.size,
        contentType: file.type,
        data: base64Data,
        uploadedAt: new Date().toISOString()
      };

      const { FileStorage } = await import("@/lib/file-storage");
      FileStorage.store(fileData);

      const fileUrl = `${process.env.NEXTJS_URL || request.nextUrl.origin}/api/file/${fileId}`;

      console.log("Fallback to memory storage:", fileUrl);

      return NextResponse.json({
        success: true,
        fileId,
        fileUrl,
        filename: file.name,
        size: file.size,
        message: "파일 업로드가 완료되었습니다 (메모리 저장소)."
      });
    }

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}