import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { FileStorage } from "@/lib/file-storage";
import fs from "fs/promises";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";
const FALLBACK_JWT_SECRET = "ppt-spell-checker-secret-key-2024-super-secure";

// 청크 업로드 세션 메타데이터 (파일시스템 기반)
interface ChunkUploadSession {
  totalChunks: number;
  filename: string;
  fileSize: number;
  uploadedChunks: number;
  uploadedChunkIndexes: Set<number>;
}

// 메모리 기반 세션 추적 (경량화, 실제 청크는 파일시스템에 저장)
const uploadSessions = new Map<string, ChunkUploadSession>();

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

    console.log(`청크 업로드: ${chunkIndex + 1}/${totalChunks}, 파일: ${filename} (${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB)`);

    // 파일 크기 제한 확인 (50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 50MB를 초과할 수 없습니다." },
        { status: 413 }
      );
    }

    // 청크 데이터를 버퍼로 변환
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

    // 업로드 세션 초기화 또는 가져오기
    if (!uploadSessions.has(uploadId)) {
      uploadSessions.set(uploadId, {
        totalChunks,
        filename,
        fileSize,
        uploadedChunks: 0,
        uploadedChunkIndexes: new Set<number>()
      });
      
      // 파일 저장소 초기화
      await FileStorage.init();
    }

    const uploadSession = uploadSessions.get(uploadId)!;
    
    // 중복 청크 업로드 방지
    if (uploadSession.uploadedChunkIndexes.has(chunkIndex)) {
      console.log(`중복 청크 무시: ${chunkIndex}`);
      return NextResponse.json({
        success: true,
        complete: false,
        uploadedChunks: uploadSession.uploadedChunks,
        totalChunks: totalChunks,
        message: `청크 ${chunkIndex + 1} 이미 업로드됨`
      });
    }
    
    try {
      // 청크를 파일시스템에 저장
      await FileStorage.storeChunk(uploadId, chunkIndex, chunkBuffer);
      
      // 업로드된 청크 추적
      uploadSession.uploadedChunkIndexes.add(chunkIndex);
      uploadSession.uploadedChunks++;
      
      console.log(`청크 저장 완료: ${uploadSession.uploadedChunks}/${totalChunks}`);

      // 모든 청크가 업로드되었는지 확인
      if (uploadSession.uploadedChunks === totalChunks) {
        console.log("모든 청크 업로드 완료, 파일 병합 중...");
        
        try {
          // 청크들을 하나의 파일로 병합하고 메타데이터에 직접 저장
          const { filePath, size } = await FileStorage.mergeChunks(uploadId, totalChunks, filename);
          
          // 파일 메타데이터 직접 저장 (이미 파일은 mergeChunks에서 저장됨)
          const fileData = {
            id: uploadId,
            filename: filename,
            size: size,
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            filePath: filePath,
            uploadedAt: new Date().toISOString(),
            status: 'complete' as const
          };
          
          // 메타데이터만 저장 (파일은 이미 존재)
          const loadMetadata = async () => {
            try {
              const METADATA_FILE = path.join(process.cwd(), 'file-metadata.json');
              const data = await fs.readFile(METADATA_FILE, 'utf8');
              const parsed = JSON.parse(data);
              return new Map(Object.entries(parsed));
            } catch {
              return new Map();
            }
          };
          
          interface FileMetadata {
            filename: string;
            uploadDate: string;
            size: number;
          }
          
          const saveMetadata = async (metadata: Map<string, FileMetadata>) => {
            const METADATA_FILE = path.join(process.cwd(), 'file-metadata.json');
            const obj = Object.fromEntries(metadata.entries());
            await fs.writeFile(METADATA_FILE, JSON.stringify(obj, null, 2));
          };
          
          const metadata = await loadMetadata();
          metadata.set(uploadId, fileData);
          await saveMetadata(metadata);
          
          // 업로드 세션 정리
          uploadSessions.delete(uploadId);

          console.log(`대용량 파일 업로드 완료: ${filename} (${Math.round(size / 1024 / 1024 * 100) / 100}MB)`);

          return NextResponse.json({
            success: true,
            complete: true,
            fileId: uploadId,
            filename: filename,
            size: size,
            message: `파일 업로드가 완료되었습니다. (${Math.round(size / 1024 / 1024 * 100) / 100}MB)`
          });

        } catch (error) {
          console.error("파일 병합 오류:", error);
          uploadSessions.delete(uploadId);
          
          return NextResponse.json(
            { error: `파일 병합 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
            { status: 500 }
          );
        }
      } else {
        // 아직 더 받을 청크가 있음
        const progress = Math.round((uploadSession.uploadedChunks / totalChunks) * 100);
        return NextResponse.json({
          success: true,
          complete: false,
          uploadedChunks: uploadSession.uploadedChunks,
          totalChunks: totalChunks,
          progress: progress,
          message: `청크 ${uploadSession.uploadedChunks}/${totalChunks} 업로드 완료 (${progress}%)`
        });
      }
    } catch (error) {
      console.error("청크 저장 오류:", error);
      return NextResponse.json(
        { error: `청크 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
        { status: 500 }
      );
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
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    
    if (!uploadId) {
      return NextResponse.json({ error: "uploadId가 필요합니다." }, { status: 400 });
    }

    const uploadSession = uploadSessions.get(uploadId);
    if (!uploadSession) {
      return NextResponse.json({ error: "업로드 세션을 찾을 수 없습니다." }, { status: 404 });
    }

    const progress = Math.round((uploadSession.uploadedChunks / uploadSession.totalChunks) * 100);
    const uploadedSizeMB = Math.round((uploadSession.uploadedChunks * uploadSession.fileSize / uploadSession.totalChunks) / 1024 / 1024 * 100) / 100;
    const totalSizeMB = Math.round(uploadSession.fileSize / 1024 / 1024 * 100) / 100;

    return NextResponse.json({
      uploadedChunks: uploadSession.uploadedChunks,
      totalChunks: uploadSession.totalChunks,
      filename: uploadSession.filename,
      fileSize: uploadSession.fileSize,
      progress: progress,
      uploadedSize: uploadedSizeMB,
      totalSize: totalSizeMB,
      status: uploadSession.uploadedChunks === uploadSession.totalChunks ? 'complete' : 'uploading'
    });
  } catch (error) {
    console.error("Upload progress check error:", error);
    return NextResponse.json(
      { error: "업로드 진행상황 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}