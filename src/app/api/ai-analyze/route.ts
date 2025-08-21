import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { spawn } from "child_process";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function POST(request: NextRequest) {
  try {
    console.log("AI Analyze API called");
    
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

    const { pptxData, text } = await request.json();

    if (!pptxData && !text) {
      return NextResponse.json(
        { error: "분석할 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // OpenAI API 키 확인
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.log("OpenAI API 키가 없습니다. Mock 데이터를 반환합니다.");
      
      // Mock AI 분석 결과 반환
      const mockResult = generateMockAIAnalysis(pptxData || { slides: [] });
      return NextResponse.json({
        success: true,
        message: "AI 분석이 완료되었습니다 (테스트 모드).",
        ...mockResult
      });
    }

    try {
      // Python AI 스크립트 실행
      const pythonScriptPath = path.join(process.cwd(), "python", "ai_spell_checker.py");
      
      let result;
      if (pptxData) {
        // PPTX 데이터 전체 분석
        result = await runAIScript(pythonScriptPath, JSON.stringify(pptxData), openaiApiKey, 'pptx');
      } else {
        // 단일 텍스트 분석
        result = await runAIScript(pythonScriptPath, text, openaiApiKey, 'text');
      }
      
      return NextResponse.json({
        success: true,
        message: "AI 분석이 완료되었습니다.",
        ...result
      });

    } catch (error) {
      console.error("AI 분석 오류:", error);
      
      // AI 분석 실패 시 Mock 데이터 반환
      const mockResult = generateMockAIAnalysis(pptxData || { slides: [] });
      return NextResponse.json({
        success: true,
        message: "AI 분석이 완료되었습니다 (테스트 모드 - AI 오류).",
        ...mockResult
      });
    }

  } catch (error) {
    console.error("AI Analyze API error:", error);
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function runAIScript(scriptPath: string, inputData: string, apiKey: string, mode: string = 'text'): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = mode === 'pptx' 
      ? [scriptPath, '--pptx-data', inputData, '--api-key', apiKey]
      : [scriptPath, inputData, apiKey];
      
    const python = spawn('python3', args);
    
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`AI 스크립트 실행 실패 (코드 ${code}): ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`AI 스크립트 출력 파싱 실패: ${error}`));
        }
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
}

function generateMockAIAnalysis(pptxData: any) {
  /**
   * Mock AI 분석 결과 생성
   * 실제 AI가 없을 때 사용할 샘플 데이터
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
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-2",
      runPath: [1, 0],
      original: "데이타",
      revised: "데이터",
      type: "consistency",
      reason: "'데이터'가 표준 외래어 표기법에 맞습니다.",
      severity: "low"
    },
    {
      slideIndex: 3,
      shapeId: "shape-3-1",
      runPath: [0, 0],
      original: "하였습니다",
      revised: "했습니다",
      type: "style",
      reason: "'했습니다'가 더 자연스러운 표현입니다.",
      severity: "low"
    }
  ];

  const slideCount = pptxData?.slides?.length || 3;
  const shapeCount = pptxData?.slides?.reduce((total: number, slide: any) => 
    total + (slide.shapes?.length || 0), 0) || 5;
  const runCount = pptxData?.slides?.reduce((total: number, slide: any) => 
    total + (slide.shapes?.reduce((shapeTotal: number, shape: any) => 
      shapeTotal + (shape.textRuns?.length || 0), 0) || 0), 0) || 8;

  return {
    jobId: `ai-mock-job-${Date.now()}`,
    suggestions: mockSuggestions,
    stats: {
      slides: slideCount,
      shapes: shapeCount,
      runs: runCount,
      tokensEstimated: mockSuggestions.reduce((total, suggestion) => 
        total + suggestion.original.length + suggestion.revised.length, 0)
    }
  };
}