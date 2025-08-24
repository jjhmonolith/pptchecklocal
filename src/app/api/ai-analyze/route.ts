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
      console.log("받은 pptxData:", pptxData ? {
        slides: pptxData.slides?.length || 0,
        stats: pptxData.stats
      } : null);
      
      // 텍스트 청크 단위로 나누어 병렬 처리
      const { chunks, originalStats } = await prepareTextChunks(pptxData, text);
      console.log(`텍스트를 ${chunks.length}개 청크로 분할, 병렬 처리 시작`);
      console.log("원본 통계:", originalStats);
      
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

      // 실제 통계 계산 (originalStats 우선 사용)
      let finalStats;
      if (originalStats) {
        finalStats = originalStats;
        console.log("원본 PPTX 통계 사용:", finalStats);
      } else {
        // fallback: 청크 기반 추정 - 실제 PPTX 구조 고려
        const uniqueSlides = [...new Set(chunks.map(c => c.slideIndex))].length;
        const estimatedStats = {
          slides: text ? 1 : Math.max(1, uniqueSlides),
          shapes: text ? 1 : chunks.length * 2, // 슬라이드당 평균 2개 텍스트박스 추정
          runs: text ? 1 : chunks.length * 3, // 텍스트박스당 평균 3개 텍스트런 추정
          tokensEstimated: chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)
        };
        finalStats = estimatedStats;
        console.log("추정 통계 사용:", estimatedStats);
      }

      const result = {
        jobId: `ai-job-${Date.now()}`,
        suggestions: allSuggestions,
        stats: finalStats
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
  stats?: {
    slides: number;
    shapes: number;
    runs: number;
    tokensEstimated: number;
  };
} | null, text?: string): Promise<{
  chunks: TextChunk[];
  originalStats?: {
    slides: number;
    shapes: number;
    runs: number;
    tokensEstimated: number;
  };
}> {
  const chunks: TextChunk[] = [];
  
  if (pptxData && pptxData.slides) {
    // 텍스트박스(셰이프)별로 청크 생성
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
    
    return { chunks, originalStats: pptxData.stats };
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
    
    return { chunks, originalStats: undefined };
  }
  
  return { chunks: [], originalStats: undefined };
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
            content: `다음은 하나의 텍스트박스 내용입니다. 이 텍스트박스 전체를 검사하고 교정 제안을 JSON 형태로 제공해 주세요.

**텍스트박스 내용:**
"${chunk.text}"

**교정 기준 (중요도 순):**

1. **맞춤법 (spelling)**: 국립국어원 표준 맞춤법 기준
   - 잘못된 철자, 외래어 표기법 오류
   - 예: "되" vs "돼", "프로그램" vs "프로그래밍"
   - 주의: '코들'은 고유명사이므로 '코드'로 수정하지 마세요

2. **띄어쓰기 (spacing)**: 한글 맞춤법 띄어쓰기 규정
   - 조사, 어미, 접사 띄어쓰기 오류
   - 예: "안녕 하세요" → "안녕하세요"

3. **문장부호 (punctuation)**: 문장부호 사용법 (매우 신중히 판단 - 의심스러우면 건드리지 마세요)
   
   **마침표를 절대 추가하면 안 되는 경우 (중요!):**
   - 명사구/단어구: "메인 화면", "로그인 버튼", "사용자 설정"
   - "~하기", "~기" 로 끝나는 모든 동명사구: "단원 내용 정리하기", "문제 풀기", "실습하기", "목표 만들기"
   - "~는 방법", "~의 특징", "~의 종류", "~의 목표", "~제시" 등의 명사구
   - "~인 상태", "~한 모습", "~된 형태" 등 상태를 나타내는 구문
   - 제목, 라벨, 목차 항목, 버튼 텍스트, 학습 목표
   - 불완전한 문구: "~한 화면", "~기능", "~메뉴", "~와 관련된"
   - 체언으로 끝나는 구: "프레젠테이션 제작", "데이터 분석"
   - 교육/학습 관련 항목: "소단원의 학습 목표 제시", "중단원 위계의 학습 목표"
   
   **마침표가 필요한 경우 (확실한 완전한 문장일 때만):**
   - 주어+서술어가 명확하고 완결된 서술문: "학생들이 열심히 공부합니다" → "학생들이 열심히 공부합니다."
   - 완전한 평서문 (동사나 형용사로 끝남): "오늘 날씨가 좋습니다" → "오늘 날씨가 좋습니다."
   - "~습니다", "~입니다", "~합니다"로 끝나는 완전한 문장

4. **문법오류 (grammar)**: 명백한 문법 오류만
   - 조사 사용 오류, 시제 불일치 등
   - 예: "을/를" 혼용, "다/요" 체계 혼용

5. **긴문장분할 (long_sentence)**: 지나치게 긴 문장 (100자 이상)
   - 읽기 어려운 긴 문장을 자연스럽게 분할
   - 의미 변경 없이 문장부호로만 분할

6. **표현개선 (expression)**: 어색한 표현 개선
   - 중복 표현, 부자연스러운 어순 등
   - 의미는 그대로 유지하며 자연스럽게 개선

**절대 금지사항:**
- 문장의 의미나 내용 변경 금지
- 문제/퀴즈의 정답 변경 금지  
- 전문 용어나 고유명사 변경 금지 (특히 '코들' 같은 서비스명은 절대 수정 금지)
- 문장 형태(평어/경어, 구어/문어) 변경 금지
- 서식이나 레이아웃 변경 금지

**마침표 추가 절대 금지사항 (매우 중요!):**
- "~하기", "~기"로 끝나는 모든 표현 ("단원 내용 정리하기", "과제 수행하기", "목표 만들기", "스스로 목표 만들기")
- "~방법", "~특징", "~종류", "~목적", "~제시" 등 명사구 ("학습 목표 제시", "키워드 제시")
- "~인 상태", "~한 모습", "~된 형태" 등 상태 표현
- 제목, 라벨, 메뉴, 버튼명, 목차 항목, 학습 목표
- 체언(명사, 대명사)으로 끝나는 모든 구문
- 교육 관련 표현: "소단원의 학습 목표 제시", "중단원 위계의 학습 목표", "키워드 제시"
- 의심스러우면 절대 마침표 추가하지 마세요!
- 완전한 문장이 아닌 구문에는 절대 마침표를 추가하지 마세요!

**교정 단위 원칙:**
- 가능하면 텍스트박스 전체 또는 완전한 문장 단위로 교정
- 문장이 여러 개인 경우 각 문장별로 교정
- 원본과 수정본이 동일한 경우 절대 제안하지 마세요
- 교정 이유에서 "마침표가 필요하다"고 하면서 실제로는 추가하지 않는 등 모순된 제안 금지

응답 형식 (JSON):
{
  "corrections": [
    {
      "original": "오류가 있는 원본 텍스트",
      "revised": "교정된 텍스트 (반드시 원본과 달라야 함)", 
      "type": "spelling|spacing|punctuation|grammar|long_sentence|expression",
      "reason": "교정 이유 설명",
      "severity": "critical|important|minor"
    }
  ]
}

**중요: corrections 배열에는 실제로 수정이 필요한 항목만 포함하세요.**
**원본과 수정본이 동일한 경우 절대 포함하지 마세요.**
**오류가 없으면 빈 배열 {"corrections": []} 을 반환하세요.**

**심각도 기준:**
- critical: 맞춤법, 띄어쓰기, 명백한 문법 오류 (반드시 수정)
- important: 문장부호, 긴문장 분할 (권장 수정)
- minor: 표현 개선 (선택적 수정)

**반드시 지켜야 할 핵심 원칙:**
1. **원본과 수정본이 완전히 동일하면 절대 corrections에 포함하지 마세요**
2. **실제 오류가 있어서 수정이 필요한 경우만 corrections에 포함하세요**
3. **수정이 필요 없으면 빈 배열 {"corrections": []} 반환하세요**

**추가 금지사항:**
- 확실한 오류만 제안하세요
- 의미 변경이 의심되면 제안하지 마세요
- 완전한 문장이 아닌 구문(명사구, 동명사구, 제목 등)에는 마침표를 절대 추가하지 마세요
- "~하기", "~제시", "~목표"로 끝나는 표현은 완전한 문장이 아니므로 마침표 불필요
- **'코들'은 고유 서비스명이므로 절대 '코드'로 수정하지 마세요**
- "수정할 필요 없음" 같은 이유로 corrections에 포함시키지 마세요
- 의심스러우면 제안하지 마세요 (특히 문장부호)`
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
      original: "안녕 하세요. 프레젠테이숀을 시작하겠읍니다.",
      revised: "안녕하세요. 프레젠테이션을 시작하겠습니다.",
      type: "spelling",
      reason: "띄어쓰기('안녕하세요')와 맞춤법('프레젠테이션', '시작하겠습니다') 오류를 수정했습니다.",
      severity: "critical"
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-1",
      runPath: [1, 0],
      original: "데이타베이스 시스템을 사용해서 사용자 정보를 저장하고 관리합니다. 이 시스템은 매우 효율적이고 안전합니다.",
      revised: "데이터베이스 시스템을 사용해서 사용자 정보를 저장하고 관리합니다. 이 시스템은 매우 효율적이고 안전합니다.",
      type: "spelling",
      reason: "'데이터베이스'가 표준 외래어 표기법에 맞는 올바른 표기입니다.",
      severity: "critical"
    },
    {
      slideIndex: 2,
      shapeId: "shape-2-2", 
      runPath: [1, 1],
      original: "주요 기능들: 로그인, 회원가입, 데이터 조회, 리포트 생성, 백업 복원, 사용자 권한 관리, 시스템 모니터링, 로그 분석, 성능 최적화 등의 다양하고 복합적인 기능들을 모두 포함하고 있어서 사용자가 필요로 하는 모든 요구사항을 충족할 수 있습니다.",
      revised: "주요 기능들: 로그인, 회원가입, 데이터 조회, 리포트 생성, 백업 복원, 사용자 권한 관리, 시스템 모니터링, 로그 분석, 성능 최적화 등의 다양한 기능들을 포함합니다. 이를 통해 사용자가 필요로 하는 모든 요구사항을 충족할 수 있습니다.",
      type: "long_sentence",
      reason: "100자가 넘는 긴 문장을 읽기 쉽게 두 문장으로 분할하고 중복 표현을 간소화했습니다.",
      severity: "important"
    },
    {
      slideIndex: 3,
      shapeId: "shape-3-1",
      runPath: [2, 0], 
      original: "데이타 분석 방법",
      revised: "데이터 분석 방법",
      type: "spelling",
      reason: "'데이터'가 표준 외래어 표기법에 맞는 올바른 표기입니다. 명사구이므로 마침표를 추가하지 않았습니다.",
      severity: "critical"
    },
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