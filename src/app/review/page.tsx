"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LogOut, ArrowLeft, CheckCircle, AlertCircle, Info, Zap, Download, Loader2, Filter, Type, Minus } from "lucide-react";
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
  type: "spelling" | "spacing" | "punctuation" | "grammar" | "long_sentence" | "expression";
  reason: string;
  severity: "critical" | "important" | "minor";
};

type AnalyzeResult = {
  jobId: string;
  suggestions: Suggestion[];
  stats: { slides: number; shapes: number; runs: number; tokensEstimated: number };
};

type FileAnalysisResult = {
  fileName: string;
  fileId: string;
  jobId: string;
  suggestions: Suggestion[];
  stats: { slides: number; shapes: number; runs: number; tokensEstimated: number };
};

type MultiFileAnalysisResult = {
  files: FileAnalysisResult[];
  timestamp: string;
};

const mockAnalyzeResult: AnalyzeResult = {
  jobId: "test-job-12345",
  suggestions: [
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
  ],
  stats: { slides: 3, shapes: 6, runs: 12, tokensEstimated: 150 }
};

function ReviewContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<MultiFileAnalysisResult | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // 필터링 상태 (복수 선택 가능)
  const [filterTypes, setFilterTypes] = useState<string[]>(['all']);
  const [filterSeverities, setFilterSeverities] = useState<string[]>(['all']);
  const [showFilters, setShowFilters] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }

    // 분석 결과 로드 (다중 파일 지원)
    const savedResults = localStorage.getItem("analysisResults");
    const savedResult = localStorage.getItem("analysisResult"); // 이전 버전과의 호환성
    const savedFileName = localStorage.getItem("uploadedFileName");
    
    if (savedResults) {
      try {
        const parsedResults: MultiFileAnalysisResult = JSON.parse(savedResults);
        setAnalysisResults(parsedResults);
      } catch (error) {
        console.error("다중 파일 분석 결과 파싱 오류:", error);
        // Fallback으로 Mock 데이터 사용
        setAnalysisResults({
          files: [{ 
            fileName: savedFileName || 'sample.pptx',
            fileId: 'mock-file-1',
            ...mockAnalyzeResult 
          }],
          timestamp: new Date().toISOString()
        });
      }
    } else if (savedResult) {
      // 이전 버전 호환성 (단일 파일)
      try {
        const parsedResult = JSON.parse(savedResult);
        if (parsedResult.suggestions) {
          setAnalysisResults({
            files: [{
              fileName: savedFileName || 'uploaded.pptx',
              fileId: 'legacy-file-1',
              ...parsedResult
            }],
            timestamp: new Date().toISOString()
          });
        } else {
          setAnalysisResults({
            files: [{ 
              fileName: savedFileName || 'sample.pptx',
              fileId: 'mock-file-1',
              ...mockAnalyzeResult 
            }],
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("분석 결과 파싱 오류:", error);
        setAnalysisResults({
          files: [{ 
            fileName: 'sample.pptx',
            fileId: 'mock-file-1',
            ...mockAnalyzeResult 
          }],
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 저장된 결과가 없으면 Mock 데이터 사용
      setAnalysisResults({
        files: [{ 
          fileName: 'sample.pptx',
          fileId: 'mock-file-1',
          ...mockAnalyzeResult 
        }],
        timestamp: new Date().toISOString()
      });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 현재 선택된 파일의 데이터
  const currentFile = analysisResults?.files[selectedFileIndex] || null;
  const analyzeResult = currentFile ? {
    jobId: currentFile.jobId,
    suggestions: currentFile.suggestions,
    stats: currentFile.stats
  } : null;

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

  // 필터링된 제안사항 계산
  const filteredSuggestions = analyzeResult?.suggestions.filter(suggestion => {
    // 유형 필터 (복수 선택)
    if (!filterTypes.includes('all') && !filterTypes.includes(suggestion.type)) return false;
    // 심각도 필터 (복수 선택)  
    if (!filterSeverities.includes('all') && !filterSeverities.includes(suggestion.severity)) return false;
    return true;
  }) || [];

  const selectAll = () => {
    if (!analyzeResult) return;
    
    // 필터링된 제안사항의 ID만 가져오기
    const filteredIds = filteredSuggestions.map((_, filteredIndex) => {
      // 원본 배열에서의 실제 인덱스 찾기
      const originalIndex = analyzeResult.suggestions.findIndex(s => s === filteredSuggestions[filteredIndex]);
      return originalIndex.toString();
    });
    
    // 기존 선택된 항목에 새로운 항목들을 추가 (중복 제거)
    setSelectedSuggestions(prev => {
      const newSet = new Set([...prev, ...filteredIds]);
      return Array.from(newSet);
    });
  };

  const deselectAll = () => {
    if (!analyzeResult) return;
    
    // 필터링된 제안사항의 ID만 가져와서 해제
    const filteredIds = filteredSuggestions.map((_, filteredIndex) => {
      const originalIndex = analyzeResult.suggestions.findIndex(s => s === filteredSuggestions[filteredIndex]);
      return originalIndex.toString();
    });
    
    // 기존 선택에서 필터링된 항목들만 제거
    setSelectedSuggestions(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // 필터 체크박스 핸들러
  const handleTypeFilterChange = (type: string, checked: boolean) => {
    if (type === 'all') {
      setFilterTypes(checked ? ['all'] : []);
    } else {
      setFilterTypes(prev => {
        const newTypes = prev.filter(t => t !== 'all'); // 'all' 제거
        if (checked) {
          const updated = [...newTypes, type];
          return updated.length === 6 ? ['all'] : updated; // 모든 항목 선택시 'all'로 변경
        } else {
          const updated = newTypes.filter(t => t !== type);
          return updated.length === 0 ? ['all'] : updated; // 아무것도 선택안되면 'all'로 복원
        }
      });
    }
  };

  const handleSeverityFilterChange = (severity: string, checked: boolean) => {
    if (severity === 'all') {
      setFilterSeverities(checked ? ['all'] : []);
    } else {
      setFilterSeverities(prev => {
        const newSeverities = prev.filter(s => s !== 'all'); // 'all' 제거
        if (checked) {
          const updated = [...newSeverities, severity];
          return updated.length === 3 ? ['all'] : updated; // 모든 항목 선택시 'all'로 변경
        } else {
          const updated = newSeverities.filter(s => s !== severity);
          return updated.length === 0 ? ['all'] : updated; // 아무것도 선택안되면 'all'로 복원
        }
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'important': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'minor': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling': return <AlertCircle className="h-4 w-4" />;
      case 'spacing': return <Zap className="h-4 w-4" />;
      case 'punctuation': return <Type className="h-4 w-4" />;
      case 'grammar': return <CheckCircle className="h-4 w-4" />;
      case 'long_sentence': return <Minus className="h-4 w-4" />;
      case 'expression': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'spelling': return '맞춤법';
      case 'spacing': return '띄어쓰기';
      case 'punctuation': return '문장부호';
      case 'grammar': return '문법';
      case 'long_sentence': return '긴문장';
      case 'expression': return '표현개선';
      default: return type;
    }
  };

  const getSeverityName = (severity: string) => {
    switch (severity) {
      case 'critical': return '필수';
      case 'important': return '권장';
      case 'minor': return '선택';
      default: return severity;
    }
  };

  const handleApplyChanges = async () => {
    if (!currentFile || selectedSuggestions.length === 0) {
      alert("선택된 교정 사항이 없습니다.");
      return;
    }
    
    setIsApplying(true);
    
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        alert("인증이 필요합니다.");
        return;
      }

      // 선택된 교정사항들 가져오기
      const selectedCorrections = selectedSuggestions
        .map(index => currentFile.suggestions[parseInt(index)])
        .filter(Boolean);

      console.log(`${selectedCorrections.length}개 교정사항 적용 시작`);

      // 교정 적용 API 호출
      const response = await fetch('/api/apply-corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileUrl: '/api/mock-file-url', // 실제로는 업로드된 파일 URL 사용
          fileName: currentFile.fileName,
          selectedCorrections,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '교정 적용 실패');
      }

      const result = await response.json();
      console.log('교정 적용 완료:', result);

      // 다운로드 URL을 localStorage에 저장
      localStorage.setItem('downloadUrl', result.downloadUrl);
      localStorage.setItem('correctedFileName', result.fileName);
      localStorage.setItem('appliedCorrections', result.appliedCorrections.toString());
      
      // 다운로드 페이지로 이동
      router.push("/download");
      
    } catch (error) {
      console.error("Apply changes error:", error);
      alert(`변경사항 적용 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                맞춤법 검사 결과
              </h1>
              {analysisResults && analysisResults.files.length > 0 && (
                <div className="mt-2">
                  {analysisResults.files.length === 1 ? (
                    <p className="text-sm text-gray-600">
                      📄 {analysisResults.files[0].fileName}
                    </p>
                  ) : (
                    <select
                      value={selectedFileIndex}
                      onChange={(e) => setSelectedFileIndex(Number(e.target.value))}
                      className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {analysisResults.files.map((file, index) => (
                        <option key={index} value={index}>
                          📄 {file.fileName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
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
            <CardContent className="p-6 space-y-4">
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
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    className="border-amber-200 hover:bg-amber-50 flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    필터 ({filteredSuggestions.length}/{analyzeResult?.suggestions.length || 0})
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

              {/* 필터 옵션 */}
              {showFilters && (
                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">교정 유형 (복수 선택)</label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: '전체' },
                        { value: 'spelling', label: '맞춤법' },
                        { value: 'spacing', label: '띄어쓰기' },
                        { value: 'punctuation', label: '문장부호' },
                        { value: 'grammar', label: '문법' },
                        { value: 'long_sentence', label: '긴문장' },
                        { value: 'expression', label: '표현개선' }
                      ].map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={filterTypes.includes(option.value)}
                            onCheckedChange={(checked) => handleTypeFilterChange(option.value, !!checked)}
                            className="border-amber-300"
                          />
                          <label className="text-sm text-gray-700">{option.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">중요도 (복수 선택)</label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: '전체' },
                        { value: 'critical', label: '필수 (반드시 수정)' },
                        { value: 'important', label: '권장 (수정 권장)' },
                        { value: 'minor', label: '선택 (선택적 수정)' }
                      ].map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={filterSeverities.includes(option.value)}
                            onCheckedChange={(checked) => handleSeverityFilterChange(option.value, !!checked)}
                            className="border-amber-300"
                          />
                          <label className="text-sm text-gray-700">{option.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions List */}
          <div className="space-y-4">
            {filteredSuggestions.length === 0 ? (
              <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500 mb-2">
                    <Info className="h-12 w-12 mx-auto mb-3" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">선택한 조건에 맞는 교정사항이 없습니다</h3>
                  <p className="text-gray-500">다른 필터 조건을 선택해보세요.</p>
                </CardContent>
              </Card>
            ) : (
              filteredSuggestions.map((suggestion, index) => {
                const originalIndex = analyzeResult?.suggestions.findIndex(s => 
                  s.slideIndex === suggestion.slideIndex && 
                  s.shapeId === suggestion.shapeId &&
                  s.original === suggestion.original
                ) || index;
                
                return (
                  <Card 
                    key={`${suggestion.slideIndex}-${suggestion.shapeId}-${index}`}
                    className={`bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer ${
                      selectedSuggestions.includes(originalIndex.toString()) ? 'ring-2 ring-amber-400 border-amber-300' : 'border-amber-200'
                    }`}
                    onClick={() => toggleSuggestion(originalIndex.toString())}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedSuggestions.includes(originalIndex.toString())}
                          onCheckedChange={() => toggleSuggestion(originalIndex.toString())}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getSeverityColor(suggestion.severity)}`}>
                              {getTypeIcon(suggestion.type)}
                              {getTypeName(suggestion.type)}
                            </span>
                            <span className="text-sm text-gray-500">
                              슬라이드 {suggestion.slideIndex}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              suggestion.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              suggestion.severity === 'important' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {getSeverityName(suggestion.severity)}
                            </span>
                          </div>
                      
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-1">원본:</div>
                                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                  <span className="text-red-700">{suggestion.original}</span>
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
                );
              })
            )}
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