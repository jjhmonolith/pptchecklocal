import { NextRequest, NextResponse } from "next/server";
import { del, list } from '@vercel/blob';

// Cron job이나 수동 호출로 오래된 파일들을 정리하는 API
export async function POST(request: NextRequest) {
  try {
    console.log("File cleanup API called");

    // 간단한 인증 (실제로는 더 강력한 보안 필요)
    const authHeader = request.headers.get("x-cleanup-key");
    if (authHeader !== process.env.CLEANUP_KEY && authHeader !== "cleanup-files-now") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 401 }
      );
    }

    try {
      // 1시간 전 타임스탬프 계산
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      // Vercel Blob에서 파일 목록 가져오기
      const { blobs } = await list({
        prefix: 'pptx_', // 우리가 업로드한 파일들만
      });

      let deletedCount = 0;
      const errors = [];

      for (const blob of blobs) {
        try {
          // 파일명에서 타임스탬프 추출
          const match = blob.pathname.match(/pptx_(\d+)_/);
          if (match) {
            const timestamp = parseInt(match[1]);
            
            // 1시간 이상 오래된 파일인지 확인
            if (timestamp < oneHourAgo) {
              await del(blob.url);
              deletedCount++;
              console.log(`삭제됨: ${blob.pathname}`);
            }
          }
        } catch (error) {
          errors.push(`${blob.pathname}: ${error}`);
          console.error(`파일 삭제 오류 (${blob.pathname}):`, error);
        }
      }

      return NextResponse.json({
        success: true,
        message: `정리 완료: ${deletedCount}개 파일 삭제됨`,
        deletedCount,
        totalFiles: blobs.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json({
        success: false,
        message: "정리 중 오류 발생",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

  } catch (error) {
    console.error("Cleanup API error:", error);
    return NextResponse.json(
      { error: "파일 정리 API 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET 요청으로 현재 저장된 파일들의 상태 확인
export async function GET() {
  try {
    const { blobs } = await list({
      prefix: 'pptx_',
    });

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const fileStats = blobs.map(blob => {
      const match = blob.pathname.match(/pptx_(\d+)_/);
      const timestamp = match ? parseInt(match[1]) : 0;
      const isOld = timestamp < oneHourAgo;
      
      return {
        filename: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(timestamp).toISOString(),
        age: Date.now() - timestamp,
        shouldDelete: isOld
      };
    });

    return NextResponse.json({
      totalFiles: blobs.length,
      oldFiles: fileStats.filter(f => f.shouldDelete).length,
      files: fileStats
    });

  } catch (error) {
    return NextResponse.json({
      error: "파일 목록 조회 실패",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}