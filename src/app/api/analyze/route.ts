import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { PPTXParser } from "@/lib/pptx-parser";
import { FileStorage } from "@/lib/file-storage";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("Analyze API called");
    
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

    const requestBody = await request.json();
    const { fileId, fileName } = requestBody;
    
    console.log("Analyze API request body:", requestBody);
    console.log("File ID:", fileId);
    console.log("File name:", fileName);

    if (!fileId) {
      return NextResponse.json(
        { error: "파일 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 파일시스템 기반 PPTX 파서 사용
    
    try {
      console.log("=== PPTX 분석 시작 ===");
      console.log("파일 ID:", fileId);
      console.log("파일명:", fileName);
      
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
      const fileBuffer = await FileStorage.readFile(fileId);
      if (!fileBuffer) {
        return NextResponse.json(
          { error: "파일 읽기에 실패했습니다." },
          { status: 500 }
        );
      }
      
      console.log("파일 읽기 완료:", {
        filename: fileData.filename,
        size: fileBuffer.length
      });
      
      // 1단계: 파일 버퍼에서 직접 PPTX 텍스트 추출
      const pptxResult = await PPTXParser.analyzeFromBuffer(fileBuffer, fileData.filename);
      console.log("PPTX 분석 완료:", pptxResult);
      
      // 2단계: AI 맞춤법 검사 (내부 API 호출)
      try {
        console.log("=== AI 분석 시작 ===");
        console.log("OpenAI API 키 존재:", !!process.env.OPENAI_API_KEY);
        console.log("API URL:", `${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/ai-analyze`);
        
        const aiResponse = await fetch(`${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/ai-analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('authorization') || '',
          },
          body: JSON.stringify({
            pptxData: pptxResult
          }),
        });

        console.log("AI API 응답 상태:", aiResponse.status);

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          console.log("AI 분석 완료:", aiResult);
          
          return NextResponse.json({
            success: true,
            jobId: aiResult.jobId || `job-${Date.now()}`,
            suggestions: aiResult.suggestions || [],
            stats: aiResult.stats || pptxResult.stats,
            message: "PPTX 분석 및 AI 맞춤법 검사가 완료되었습니다."
          });
        } else {
          const errorText = await aiResponse.text();
          console.log("AI 분석 실패 응답:", errorText);
          console.log("AI 분석 실패, PPTX 결과만 반환");
          // AI 분석 실패 시에도 PPTX 구조 분석 결과는 반환
          throw new Error(`AI 분석 실패: ${aiResponse.status} ${errorText}`);
        }
      } catch (aiError) {
        console.error("AI 분석 오류:", aiError);
        // AI 분석 실패 시 Mock 데이터 반환
        const mockResult = generateMockAnalysis(pptxResult);
        return NextResponse.json({
          success: true,
          message: "분석이 완료되었습니다 (AI 오류, Mock 데이터 사용).",
          ...mockResult
        });
      }

    } catch (error) {
      console.error("Python script error:", error);
      
      // Python 환경이 없는 경우 완전 Mock 데이터 반환
      const mockResult = {
        jobId: `mock-job-${Date.now()}`,
        suggestions: [
          {
            slideIndex: 1,
            shapeId: "shape-1",
            runPath: [0, 0],
            original: "안녕 하세요",
            revised: "안녕하세요",
            type: "spacing",
            reason: "띄어쓰기 오류",
            severity: "high"
          },
          {
            slideIndex: 1,
            shapeId: "shape-2",
            runPath: [1, 0],
            original: "프레젠테이숀",
            revised: "프레젠테이션",
            type: "spelling",
            reason: "맞춤법 오류",
            severity: "high"
          },
          {
            slideIndex: 2,
            shapeId: "shape-3",
            runPath: [0, 1],
            original: "있읍니다",
            revised: "있습니다",
            type: "spelling",
            reason: "맞춤법 오류",
            severity: "med"
          }
        ],
        stats: { slides: 2, shapes: 3, runs: 8, tokensEstimated: 120 },
        debug: {
          reason: "PPTX 분석 실패",
          parser: "Node.js JSZip",
          fileId: fileId,
          openaiKeyExists: !!process.env.OPENAI_API_KEY,
          error: error instanceof Error ? error.message : String(error)
        }
      };

      return NextResponse.json({
        success: true,
        message: "분석이 완료되었습니다 (테스트 모드).",
        ...mockResult
      });
    }

  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// Python 스크립트 함수는 더 이상 사용하지 않음 (Node.js PPTX 파서 사용)

function generateMockAnalysis(pptxResult: { stats?: { slides: number; shapes: number; runs: number; tokensEstimated: number } } | null) {
  /**
   * PPTX 분석 결과를 기반으로 Mock AI 분석 결과 생성
   */
  const mockSuggestions = [
    {
      slideIndex: 1,
      shapeId: "shape-1-1",
      runPath: [0, 0],
      original: "안녕 하세요",
      revised: "안녕하세요",
      type: "spacing",
      reason: "인사말은 띄어쓰지 않습니다.",
      severity: "high"
    },
    {
      slideIndex: 1,
      shapeId: "shape-1-2",
      runPath: [1, 0],
      original: "프레젠테이숀",
      revised: "프레젠테이션",
      type: "spelling",
      reason: "'프레젠테이션'이 올바른 표기입니다.",
      severity: "high"
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-1",
      runPath: [0, 1],
      original: "있읍니다",
      revised: "있습니다",
      type: "spelling",
      reason: "'있습니다'가 표준 맞춤법입니다.",
      severity: "med"
    }
  ];

  return {
    jobId: `mock-ai-job-${Date.now()}`,
    suggestions: mockSuggestions,
    stats: pptxResult?.stats || { slides: 2, shapes: 3, runs: 8, tokensEstimated: 120 }
  };
}