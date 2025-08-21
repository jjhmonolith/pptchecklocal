"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LogOut, ArrowLeft, CheckCircle, AlertCircle, Info, Zap, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

// 타입 정의
type Suggestion = {
  slideIndex: number;
  shapeId: string;
  runPath: number[];
  original: string;
  revised: string;
  type: "spelling" | "spacing" | "grammar" | "style" | "consistency";
  reason: string;
  severity: "low" | "med" | "high";
};

type AnalyzeResult = {
  jobId: string;
  suggestions: Suggestion[];
  stats: { slides: number; shapes: number; runs: number; tokensEstimated: number };
};

const mockAnalyzeResult: AnalyzeResult = {
  jobId: "test-job-12345",
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
    },
    {
      slideIndex: 3,
      shapeId: "shape-4",
      runPath: [2, 0],
      original: "데이타",
      revised: "데이터",
      type: "consistency",
      reason: "일관성 유지를 위해 표준 표기 사용 권장",
      severity: "low"
    },
    {
      slideIndex: 3,
      shapeId: "shape-5",
      runPath: [0, 2],
      original: "하였습니다.",
      revised: "했습니다.",
      type: "style",
      reason: "간결한 표현 권장",
      severity: "low"
    }
  ],
  stats: { slides: 3, shapes: 5, runs: 12, tokensEstimated: 150 }
};

function ReviewContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }

    // Mock 데이터 로드 (실제로는 API 호출)
    setTimeout(() => {
      setAnalyzeResult(mockAnalyzeResult);
    }, 1000);
  }, [router, searchParams]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/");
  };

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestionId) 
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const selectAll = () => {
    if (!analyzeResult) return;
    const allIds = analyzeResult.suggestions.map((_, index) => index.toString());
    setSelectedSuggestions(allIds);
  };

  const deselectAll = () => {
    setSelectedSuggestions([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'med': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling': return <AlertCircle className="h-4 w-4" />;
      case 'spacing': return <Zap className="h-4 w-4" />;
      case 'grammar': return <CheckCircle className="h-4 w-4" />;
      case 'style': return <Info className="h-4 w-4" />;
      case 'consistency': return <FileText className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const handleApplyChanges = async () => {
    setIsApplying(true);
    
    try {
      // 선택된 제안사항들을 적용하는 API 호출 (나중에 구현)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 다운로드 페이지로 이동
      router.push("/download");
    } catch (error) {
      console.error("Apply changes error:", error);
      alert("변경사항 적용 중 오류가 발생했습니다.");
    } finally {
      setIsApplying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!analyzeResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>분석 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(251, 191, 36, 0.15) 0%, transparent 40%)`,
        }}
      />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 blur-lg bg-gradient-to-r from-amber-400 to-orange-400 opacity-40 animate-pulse" />
              <FileText className="h-8 w-8 text-amber-500 relative" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              맞춤법 검사 결과
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/upload">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-amber-200 hover:bg-amber-50"
              >
                <ArrowLeft className="h-4 w-4" />
                업로드로 돌아가기
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats Card */}
          <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                분석 완료
              </CardTitle>
              <CardDescription>
                PPT 파일 분석이 완료되었습니다. 아래에서 교정 제안사항을 검토해보세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{analyzeResult.stats.slides}</div>
                  <div className="text-sm text-gray-600">슬라이드</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{analyzeResult.suggestions.length}</div>
                  <div className="text-sm text-gray-600">교정 제안</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{analyzeResult.stats.shapes}</div>
                  <div className="text-sm text-gray-600">텍스트 박스</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{selectedSuggestions.length}</div>
                  <div className="text-sm text-gray-600">선택된 항목</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Card */}
          <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Button 
                    onClick={selectAll} 
                    variant="outline"
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    전체 선택
                  </Button>
                  <Button 
                    onClick={deselectAll} 
                    variant="outline"
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    전체 해제
                  </Button>
                </div>
                <Button
                  onClick={handleApplyChanges}
                  disabled={selectedSuggestions.length === 0 || isApplying}
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {isApplying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      적용 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      선택 항목 적용 ({selectedSuggestions.length})
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions List */}
          <div className="space-y-4">
            {analyzeResult.suggestions.map((suggestion, index) => (
              <Card 
                key={index} 
                className={`bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  selectedSuggestions.includes(index.toString()) ? 'ring-2 ring-amber-400 border-amber-300' : 'border-amber-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedSuggestions.includes(index.toString())}
                      onCheckedChange={() => toggleSuggestion(index.toString())}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getSeverityColor(suggestion.severity)}`}>
                          {getTypeIcon(suggestion.type)}
                          {suggestion.type === 'spelling' ? '맞춤법' :
                           suggestion.type === 'spacing' ? '띄어쓰기' :
                           suggestion.type === 'grammar' ? '문법' :
                           suggestion.type === 'style' ? '문체' : '일관성'}
                        </span>
                        <span className="text-sm text-gray-500">
                          슬라이드 {suggestion.slideIndex}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          suggestion.severity === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.severity === 'med' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {suggestion.severity === 'high' ? '높음' :
                           suggestion.severity === 'med' ? '보통' : '낮음'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">원본:</div>
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                              <span className="line-through text-red-700">{suggestion.original}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">수정:</div>
                            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <span className="text-green-700 font-medium">{suggestion.revised}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 italic">
                          💡 {suggestion.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}