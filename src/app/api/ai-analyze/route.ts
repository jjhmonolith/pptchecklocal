import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

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
      console.log("OpenAI API 직접 호출 시작");
      
      // 텍스트 청크 단위로 나누어 병렬 처리
      const chunks = await prepareTextChunks(pptxData, text);
      console.log(`텍스트를 ${chunks.length}개 청크로 분할, 병렬 처리 시작`);
      
      if (chunks.length === 0) {
        throw new Error("분석할 텍스트가 없습니다.");
      }

      // 청크들을 병렬로 처리
      const chunkPromises = chunks.map((chunk, index) => 
        processTextChunk(chunk, openaiApiKey, index)
      );

      const chunkResults = await Promise.all(chunkPromises);
      console.log(`${chunkResults.length}개 청크 처리 완료`);

      // 결과 통합
      const allSuggestions = chunkResults.flatMap((result, chunkIndex) => 
        result.corrections?.map((correction: {
          original: string;
          revised: string;
          type: string;
          reason: string;
          severity: string;
        }, index: number) => ({
          slideIndex: result.slideIndex || 1,
          shapeId: result.shapeId || `chunk-${chunkIndex}-shape-${index + 1}`,
          runPath: result.runPath || [chunkIndex, index],
          original: correction.original,
          revised: correction.revised,
          type: correction.type,
          reason: correction.reason,
          severity: correction.severity
        })) || []
      );

      const result = {
        jobId: `ai-job-${Date.now()}`,
        suggestions: allSuggestions,
        stats: pptxData?.stats || { slides: chunks.length, shapes: chunks.length, runs: chunks.length, tokensEstimated: chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) }
      };
      
      console.log("AI 분석 완료, 제안 개수:", allSuggestions.length);
      
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
        message: "AI 분석이 완료되었습니다 (오류 발생, Mock 데이터 사용).",
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

interface TextChunk {
  text: string;
  slideIndex: number;
  shapeId: string;
  runPath: number[];
}

async function prepareTextChunks(pptxData: {
  slides?: Array<{
    shapes?: Array<{
      textRuns?: Array<{ text: string }>;
      shapeId?: string;
    }>;
  }>;
} | null, text?: string): Promise<TextChunk[]> {
  const chunks: TextChunk[] = [];
  
  if (pptxData && pptxData.slides) {
    // 슬라이드 단위로 청크 생성
    pptxData.slides.forEach((slide, slideIndex: number) => {
      if (slide.shapes) {
        slide.shapes.forEach((shape, shapeIndex: number) => {
          if (shape.textRuns && shape.textRuns.length > 0) {
            const shapeText = shape.textRuns
              .map((run) => run.text)
              .join(' ')
              .trim();
              
            if (shapeText) {
              chunks.push({
                text: shapeText,
                slideIndex: slideIndex + 1,
                shapeId: shape.shapeId || `shape-${slideIndex + 1}-${shapeIndex + 1}`,
                runPath: [slideIndex, shapeIndex]
              });
            }
          }
        });
      }
    });
  } else if (text) {
    // 단순 텍스트인 경우 적당한 길이로 나누기 (최대 1000자)
    const maxChunkSize = 1000;
    const sentences = text.split(/[.!?]\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          slideIndex: chunkIndex + 1,
          shapeId: `text-chunk-${chunkIndex + 1}`,
          runPath: [chunkIndex, 0]
        });
        currentChunk = sentence;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        slideIndex: chunkIndex + 1,
        shapeId: `text-chunk-${chunkIndex + 1}`,
        runPath: [chunkIndex, 0]
      });
    }
  }
  
  return chunks;
}

async function processTextChunk(chunk: TextChunk, apiKey: string, index: number) {
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 한국어 맞춤법 검사 전문가입니다. 주어진 텍스트의 맞춤법, 띄어쓰기, 문법, 일관성, 문체를 검사하고 JSON 형태로 교정 제안을 제공합니다.'
          },
          {
            role: 'user',
            content: `다음 한국어 텍스트의 맞춤법, 띄어쓰기, 문법, 일관성, 문체를 검사하고 교정 제안을 JSON 형태로 제공해 주세요.

검사할 텍스트:
"${chunk.text}"

다음 기준으로 검사해 주세요:
1. **맞춤법 (spelling)**: 잘못된 철자
2. **띄어쓰기 (spacing)**: 잘못된 띄어쓰기
3. **문법 (grammar)**: 문법적 오류
4. **일관성 (consistency)**: 용어나 표기의 일관성
5. **문체 (style)**: 더 나은 표현이나 간결한 문장

응답 형식 (JSON):
{
  "corrections": [
    {
      "original": "원본 텍스트",
      "revised": "교정된 텍스트", 
      "type": "spelling|spacing|grammar|consistency|style",
      "reason": "교정 이유 설명",
      "severity": "high|med|low"
    }
  ]
}

중요한 점:
- 명확한 오류만 교정 제안하세요
- 교정 이유를 명확히 설명하세요  
- 심각도(severity)를 적절히 판단하세요
- 원본과 교정본이 동일한 경우는 제외하세요
- 빈 배열 {"corrections": []} 도 유효한 응답입니다`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      console.error(`청크 ${index} OpenAI API 오류:`, openaiResponse.status, openaiResponse.statusText);
      throw new Error(`OpenAI API 오류: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const aiContent = JSON.parse(openaiResult.choices[0].message.content);
    
    return {
      ...aiContent,
      slideIndex: chunk.slideIndex,
      shapeId: chunk.shapeId,
      runPath: chunk.runPath
    };
    
  } catch (error) {
    console.error(`청크 ${index} 처리 오류:`, error);
    // 오류 시 빈 결과 반환
    return {
      corrections: [],
      slideIndex: chunk.slideIndex,
      shapeId: chunk.shapeId,
      runPath: chunk.runPath
    };
  }
}


function generateMockAIAnalysis(pptxData: {
  slides?: Array<{
    shapes?: Array<{
      textRuns?: Array<unknown>;
    }>;
  }>;
}) {
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
  const shapeCount = pptxData?.slides?.reduce((total: number, slide) => 
    total + (slide.shapes?.length || 0), 0) || 5;
  const runCount = pptxData?.slides?.reduce((total: number, slide) => 
    total + (slide.shapes?.reduce((shapeTotal: number, shape) => 
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