import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { PPTXModifier } from "@/lib/pptx-modifier";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

// Global 타입 확장
declare global {
  var tempFiles: Map<string, ArrayBuffer> | undefined;
}

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

    const { fileUrl, fileName, selectedCorrections, fileData } = await request.json();

    if ((!fileUrl && !fileData) || !selectedCorrections) {
      return NextResponse.json(
        { error: "파일 URL 또는 파일 데이터와 교정 사항이 필요합니다." },
        { status: 400 }
      );
    }

    console.log("교정 적용 시작:", {
      fileName,
      correctionsCount: selectedCorrections.length,
      hasFileData: !!fileData
    });

    try {
      let modifiedBuffer: ArrayBuffer;
      
      if (fileData) {
        // Base64 데이터에서 직접 처리
        console.log("Base64 데이터에서 직접 파일 처리");
        const buffer = Buffer.from(fileData, 'base64');
        modifiedBuffer = await PPTXModifier.applyCorrectionsFromBuffer(buffer, selectedCorrections);
      } else {
        // URL에서 파일 다운로드
        const origin = request.headers.get('origin') || 
                       request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                       'http://localhost:3000';
        const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `${origin}${fileUrl}`;
        
        console.log("파일 URL 변환:", { fileUrl, fullFileUrl });
        modifiedBuffer = await PPTXModifier.applyCorrections(fullFileUrl, selectedCorrections, token);
      }
      
      // 임시 파일명 생성
      const timestamp = Date.now();
      const correctedFileName = fileName.replace('.pptx', `_교정됨_${timestamp}.pptx`);
      
      // 수정된 파일을 임시 저장소에 저장 (실제로는 파일시스템이나 클라우드 스토리지에 저장)
      // 현재는 메모리에만 보관하고 다운로드 URL 제공
      global.tempFiles = global.tempFiles || new Map();
      global.tempFiles.set(correctedFileName, modifiedBuffer);
      
      // 30분 후 임시 파일 삭제
      setTimeout(() => {
        if (global.tempFiles) {
          global.tempFiles.delete(correctedFileName);
          console.log(`임시 파일 삭제됨: ${correctedFileName}`);
        }
      }, 30 * 60 * 1000); // 30분
      
      const response = {
        success: true,
        message: `${selectedCorrections.length}개 교정사항이 적용되었습니다.`,
        downloadUrl: `/api/download/${encodeURIComponent(correctedFileName)}`,
        appliedCorrections: selectedCorrections.length,
        fileName: correctedFileName,
        timestamp: new Date().toISOString()
      };

      console.log("교정 적용 완료:", {
        fileName: response.fileName,
        appliedCorrections: response.appliedCorrections
      });

      return NextResponse.json(response);
      
    } catch (error) {
      console.error("PPTX 수정 오류:", error);
      return NextResponse.json(
        { error: "파일 수정 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : "알 수 없는 오류") },
        { status: 500 }
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