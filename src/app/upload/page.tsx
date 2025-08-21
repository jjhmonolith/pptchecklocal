"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileText, LogOut, Upload, File, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  url?: string;
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }
  }, [router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pptxFiles = acceptedFiles.filter(file => 
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.endsWith('.pptx')
    );

    if (pptxFiles.length === 0) {
      alert("PowerPoint(.pptx) 파일만 업로드 가능합니다.");
      return;
    }

    for (const file of pptxFiles) {
      const fileId = Date.now() + Math.random().toString(36);
      
      // 파일 추가
      const newFile: UploadedFile = {
        file,
        id: fileId,
        status: 'uploading',
        progress: 0,
      };

      setUploadedFiles(prev => [...prev, newFile]);

      try {
        // 1단계: 업로드 URL 요청
        const urlResponse = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          throw new Error(errorData.error || 'URL 생성 실패');
        }

        const { uploadUrl, fileUrl } = await urlResponse.json();

        // 임시로 성공 처리 (실제로는 uploadUrl로 파일 업로드)
        console.log('Mock upload to:', uploadUrl);
        
        // 업로드 진행률 시뮬레이션
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: 50 }
              : f
          )
        );

        // 약간의 지연 후 완료 처리
        await new Promise(resolve => setTimeout(resolve, 1000));

        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'uploaded', progress: 100, url: fileUrl }
              : f
          )
        );

      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error', progress: 0 }
              : f
          )
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB (클라이언트 직접 업로드)
  });

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    const uploadedFilesList = uploadedFiles.filter(f => f.status === 'uploaded');
    
    if (uploadedFilesList.length === 0) {
      alert("업로드된 파일이 없습니다.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // 여기서 분석 API 호출 (나중에 구현)
      // 임시로 2초 후 리뷰 페이지로 이동
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 첫 번째 파일 URL을 쿼리로 전달
      router.push(`/review?fileUrl=${encodeURIComponent(uploadedFilesList[0].url || '')}`);
    } catch (error) {
      console.error('Analysis error:', error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
              PPT 맞춤법 검사기
            </h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Card */}
          <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Upload className="h-6 w-6 text-amber-500" />
                <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                  PowerPoint 파일 업로드
                </span>
              </CardTitle>
              <CardDescription>
                .pptx 파일을 드래그 앤 드롭하거나 클릭하여 업로드하세요. (최대 50MB)
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
                  ${isDragActive 
                    ? 'border-amber-400 bg-amber-50 scale-105' 
                    : 'border-amber-200 hover:border-amber-300 hover:bg-amber-25'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-xl opacity-30 animate-pulse" />
                    <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-4 shadow-lg">
                      <Upload className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  
                  {isDragActive ? (
                    <div>
                      <p className="text-lg font-medium text-amber-700">파일을 여기에 놓으세요!</p>
                      <p className="text-sm text-amber-600">PowerPoint(.pptx) 파일만 지원됩니다</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        PowerPoint 파일을 드래그하거나 클릭하여 업로드
                      </p>
                      <p className="text-sm text-gray-500">
                        .pptx 형식만 지원 • 최대 50MB • 여러 파일 업로드 가능
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5 text-amber-500" />
                  업로드된 파일 ({uploadedFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${ 
                          file.status === 'uploaded' ? 'bg-green-100 text-green-600' :
                          file.status === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {file.status === 'uploaded' ? <CheckCircle className="h-5 w-5" /> :
                           file.status === 'error' ? <AlertCircle className="h-5 w-5" /> :
                           <Loader2 className="h-5 w-5 animate-spin" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.file.size)} • {
                              file.status === 'uploaded' ? '업로드 완료' :
                              file.status === 'error' ? '업로드 실패' :
                              '업로드 중...'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => removeFile(file.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {uploadedFiles.some(f => f.status === 'uploaded') && (
                  <div className="mt-6 text-center">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isProcessing}
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          분석 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          맞춤법 검사 시작
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-gray-800 mb-2">💡 사용 팁</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• PowerPoint(.pptx) 파일만 업로드 가능합니다</p>
                  <p>• 파일 크기는 최대 50MB까지 지원됩니다</p>
                  <p>• 여러 파일을 동시에 업로드할 수 있습니다</p>
                  <p>• 업로드 완료 후 &quot;맞춤법 검사 시작&quot;을 클릭하세요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}