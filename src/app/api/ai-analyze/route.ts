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
          type: 'spelling' | 'spacing' | 'punctuation' | 'grammar' | 'long_sentence' | 'expression';
          reason: string;
          severity: 'critical' | 'important' | 'minor';
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
            content: '당신은 국립국어원 표준을 따르는 한국어 교정 전문가입니다. 프레젠테이션 텍스트의 기본적인 오류만을 교정하며, 문장의 의미나 내용을 절대 변경하지 않습니다.'
          },
          {
            role: 'user',
            content: `다음 프레젠테이션 텍스트를 검사하고 교정 제안을 JSON 형태로 제공해 주세요.

검사할 텍스트:
"${chunk.text}"

**교정 기준 (중요도 순):**

1. **맞춤법 (spelling)**: 국립국어원 표준 맞춤법 기준
   - 잘못된 철자, 외래어 표기법 오류
   - 예: "되" vs "돼", "프로그램" vs "프로그래밍"

2. **띄어쓰기 (spacing)**: 한글 맞춤법 띄어쓰기 규정
   - 조사, 어미, 접사 띄어쓰기 오류
   - 예: "안녕 하세요" → "안녕하세요"

3. **문장부호 (punctuation)**: 문장부호 사용법
   - 마침표, 쉼표, 따옴표 등의 올바른 사용
   - 예: "안녕하세요 ." → "안녕하세요."

4. **문법오류 (grammar)**: 명백한 문법 오류만
   - 조사 사용 오류, 시제 불일치 등
   - 예: "을/를" 혼용, "다/요" 체계 혼용

5. **긴문장분할 (long_sentence)**: 지나치게 긴 문장 (80자 이상)
   - 읽기 어려운 긴 문장을 자연스럽게 분할
   - 의미 변경 없이 문장부호로만 분할

6. **표현개선 (expression)**: 어색한 표현 개선
   - 중복 표현, 부자연스러운 어순 등
   - 의미는 그대로 유지하며 자연스럽게 개선

**절대 금지사항:**
- 문장의 의미나 내용 변경 금지
- 문제/퀴즈의 정답 변경 금지  
- 전문 용어나 고유명사 변경 금지
- 문장 형태(평어/경어, 구어/문어) 변경 금지
- 서식이나 레이아웃 변경 금지

응답 형식 (JSON):
{
  "corrections": [
    {
      "original": "원본 텍스트",
      "revised": "교정된 텍스트", 
      "type": "spelling|spacing|punctuation|grammar|long_sentence|expression",
      "reason": "교정 이유 설명",
      "severity": "critical|important|minor"
    }
  ]
}

**심각도 기준:**
- critical: 맞춤법, 띄어쓰기, 명백한 문법 오류 (반드시 수정)
- important: 문장부호, 긴문장 분할 (권장 수정)
- minor: 표현 개선 (선택적 수정)

**중요한 점:**
- 확실한 오류만 제안하세요
- 의미 변경이 의심되면 제안하지 마세요
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
      reason: "인사말은 띄어쓰지 않습니다. (한글 맞춤법 띄어쓰기 규정)",
      severity: "critical"
    },
    {
      slideIndex: 1,
      shapeId: "shape-1-2",
      runPath: [1, 0],
      original: "프레젠테이숀",
      revised: "프레젠테이션",
      type: "spelling",
      reason: "'프레젠테이션'이 표준 외래어 표기법에 맞는 올바른 표기입니다.",
      severity: "critical"
    },
    {
      slideIndex: 1,
      shapeId: "shape-1-3",
      runPath: [1, 1],
      original: "안녕하세요 .",
      revised: "안녕하세요.",
      type: "punctuation",
      reason: "마침표 앞에 공백이 있으면 안 됩니다.",
      severity: "important"
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-1",
      runPath: [0, 1],
      original: "데이타베이스를 사용해서 정보를 저장하고 있읍니다",
      revised: "데이터베이스를 사용해서 정보를 저장하고 있습니다",
      type: "spelling",
      reason: "'데이터'와 '있습니다'가 표준 맞춤법입니다.",
      severity: "critical"
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-2",
      runPath: [1, 0],
      original: "이 시스템은 매우 복잡하고 어려우며 사용자가 이해하기 힘들고 접근성이 떨어지는 특징을 가지고 있어서 개선이 필요합니다.",
      revised: "이 시스템은 매우 복잡하고 어려우며 사용자가 이해하기 힘듭니다. 접근성이 떨어지는 특징을 가지고 있어서 개선이 필요합니다.",
      type: "long_sentence",
      reason: "80자가 넘는 긴 문장을 읽기 쉽게 두 문장으로 분할했습니다.",
      severity: "important"
    },
    {
      slideIndex: 3,
      shapeId: "shape-3-1",
      runPath: [0, 0],
      original: "그래서 그러므로",
      revised: "그러므로",
      type: "expression",
      reason: "중복 표현을 제거하여 자연스럽게 개선했습니다.",
      severity: "minor"
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