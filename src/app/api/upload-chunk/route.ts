import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { put } from '@vercel/blob';

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";
const FALLBACK_JWT_SECRET = "ppt-spell-checker-secret-key-2024-super-secure";

// 청크별 데이터를 임시 저장 (실제로는 데이터베이스나 Redis 사용 권장)
const chunkStorage = new Map<string, {
  chunks: Buffer[];
  totalChunks: number;
  filename: string;
  fileSize: number;
  uploadedChunks: number;
}>();

export async function POST(request: NextRequest) {
  try {
    console.log("Chunk upload API called");
    
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // JWT 검증 (fallback 포함)
    try {
      verify(token, JWT_SECRET);
    } catch {
      try {
        verify(token, FALLBACK_JWT_SECRET);
      } catch {
        return NextResponse.json(
          { error: "유효하지 않은 토큰입니다." },
          { status: 401 }
        );
      }
    }

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const filename = formData.get('filename') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);
    const uploadId = formData.get('uploadId') as string;

    if (!chunk || chunkIndex === undefined || !totalChunks || !filename || !uploadId) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    console.log(`청크 업로드: ${chunkIndex + 1}/${totalChunks}, 파일: ${filename}`);

    // 청크 데이터를 버퍼로 변환
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

    // 업로드 세션 초기화 또는 가져오기
    if (!chunkStorage.has(uploadId)) {
      chunkStorage.set(uploadId, {
        chunks: new Array(totalChunks),
        totalChunks,
        filename,
        fileSize,
        uploadedChunks: 0
      });
    }

    const uploadSession = chunkStorage.get(uploadId)!;
    
    // 청크 저장
    uploadSession.chunks[chunkIndex] = chunkBuffer;
    uploadSession.uploadedChunks++;

    console.log(`청크 저장 완료: ${uploadSession.uploadedChunks}/${totalChunks}`);

    // 모든 청크가 업로드되었는지 확인
    if (uploadSession.uploadedChunks === totalChunks) {
      console.log("모든 청크 업로드 완료, 파일 합치는 중...");
      
      try {
        // 모든 청크를 하나로 합치기
        const completeFile = Buffer.concat(uploadSession.chunks);
        
        // Vercel Blob에 최종 파일 업로드
        const timestamp = Date.now();
        const blobFilename = `pptx_${timestamp}_${filename}`;
        
        const blob = await put(blobFilename, completeFile, {
          access: 'public',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });

        // 임시 데이터 정리
        chunkStorage.delete(uploadId);

        console.log(`파일 업로드 완료: ${blob.url}`);

        return NextResponse.json({
          success: true,
          complete: true,
          fileUrl: blob.url,
          filename: filename,
          size: fileSize,
          message: "파일 업로드가 완료되었습니다."
        });

      } catch (error) {
        console.error("최종 파일 업로드 오류:", error);
        chunkStorage.delete(uploadId);
        
        return NextResponse.json(
          { error: "파일 합치기 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }
    } else {
      // 아직 더 받을 청크가 있음
      return NextResponse.json({
        success: true,
        complete: false,
        uploadedChunks: uploadSession.uploadedChunks,
        totalChunks: totalChunks,
        message: `청크 ${uploadSession.uploadedChunks}/${totalChunks} 업로드 완료`
      });
    }

  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: "청크 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 업로드 진행상황 확인용 GET 엔드포인트
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');
  
  if (!uploadId) {
    return NextResponse.json({ error: "uploadId가 필요합니다." }, { status: 400 });
  }

  const uploadSession = chunkStorage.get(uploadId);
  if (!uploadSession) {
    return NextResponse.json({ error: "업로드 세션을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    uploadedChunks: uploadSession.uploadedChunks,
    totalChunks: uploadSession.totalChunks,
    filename: uploadSession.filename,
    progress: Math.round((uploadSession.uploadedChunks / uploadSession.totalChunks) * 100)
  });
}