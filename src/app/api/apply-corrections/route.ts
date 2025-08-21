import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { PPTXModifier } from "@/lib/pptx-modifier";
import { FileStorage } from "@/lib/file-storage";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("Apply Corrections API called");
    
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

    const { fileId, fileName, selectedCorrections } = await request.json();

    if (!fileId || !selectedCorrections) {
      return NextResponse.json(
        { error: "파일 ID와 교정 사항이 필요합니다." },
        { status: 400 }
      );
    }

    console.log("교정 적용 시작:", {
      fileId,
      fileName,
      correctionsCount: selectedCorrections.length
    });

    try {
      // 파일 저장소 초기화
      await FileStorage.init();
      
      // 파일 데이터 조회
      const fileData = await FileStorage.get(fileId);
      if (!fileData) {
        return NextResponse.json(
          { error: "파일을 찾을 수 없습니다. 파일이 만료되었거나 삭제되었을 수 있습니다." },
          { status: 404 }
        );
      }
      
      // 파일 읽기
      const originalBuffer = await FileStorage.readFile(fileId);
      if (!originalBuffer) {
        return NextResponse.json(
          { error: "파일 읽기에 실패했습니다." },
          { status: 500 }
        );
      }
      
      console.log("원본 파일 읽기 완료:", {
        filename: fileData.filename,
        size: originalBuffer.length
      });
      
      // PPT 교정 적용 (Buffer에서 직접 처리)
      const modifiedArrayBuffer = await PPTXModifier.applyCorrectionsFromBuffer(
        originalBuffer, 
        selectedCorrections
      );
      
      // ArrayBuffer를 Buffer로 변환
      const modifiedBuffer = Buffer.from(modifiedArrayBuffer);
      
      // Save corrected file to filesystem
      const timestamp = Date.now();
      const processedFileId = await FileStorage.storeProcessed(
        fileId, 
        modifiedBuffer, 
        `_corrected_${timestamp}`
      );
      
      const response = {
        success: true,
        message: `${selectedCorrections.length}개 교정사항이 적용되었습니다.`,
        downloadFileId: processedFileId,
        appliedCorrections: selectedCorrections.length,
        originalFileName: fileData.filename,
        timestamp: new Date().toISOString(),
        processedSize: modifiedBuffer.length
      };

      console.log("교정 적용 완료:", {
        originalFile: fileData.filename,
        processedFileId: processedFileId,
        appliedCorrections: response.appliedCorrections,
        processedSizeMB: Math.round(modifiedBuffer.length / 1024 / 1024 * 100) / 100
      });

      return NextResponse.json(response);
      
    } catch (error) {
      console.error("PPTX 교정 적용 오류:", error);
      
      // 더 자세한 에러 분류
      let errorMessage = "파일 교정 중 오류가 발생했습니다.";
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes("파일을 찾을 수 없습니다") || error.message.includes("404")) {
          errorMessage = "파일을 찾을 수 없습니다. 파일이 만료되었거나 삭제되었을 수 있습니다. 파일을 다시 업로드해 주세요.";
          statusCode = 404;
        } else if (error.message.includes("parse") || error.message.includes("corrupt")) {
          errorMessage = "파일이 손상되었거나 올바른 PPTX 형식이 아닙니다: " + error.message;
          statusCode = 400;
        } else if (error.message.includes("권한") || error.message.includes("permission")) {
          errorMessage = "파일 접근 권한 오류가 발생했습니다.";
          statusCode = 403;
        } else {
          errorMessage = "파일 교정 중 오류가 발생했습니다: " + error.message;
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          debug: {
            originalError: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            fileId,
            fileName
          }
        },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error("Apply Corrections API error:", error);
    return NextResponse.json(
      { error: "교정 사항 적용 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}