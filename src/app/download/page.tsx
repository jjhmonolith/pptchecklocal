"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LogOut, Download, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DownloadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }

    // Mock 다운로드 URL 생성 (실제로는 서버에서 생성)
    setTimeout(() => {
      setDownloadUrl("https://mock-download.example.com/corrected-presentation.pptx");
      setIsGenerating(false);
    }, 3000);
  }, [router]);

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

  const handleDownload = () => {
    if (downloadUrl) {
      // Mock 다운로드 (실제로는 파일 다운로드)
      window.open(downloadUrl, '_blank');
    }
  };

  const startNewCorrection = () => {
    router.push("/upload");
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
              교정 완료
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

        <div className="max-w-2xl mx-auto">
          {isGenerating ? (
            /* Generating State */
            <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
              <CardHeader className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-xl opacity-40 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-4 shadow-lg">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                  </div>
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                  교정된 파일 생성 중...
                </CardTitle>
                <CardDescription>
                  선택하신 교정사항을 적용하여 새로운 PowerPoint 파일을 생성하고 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-64 bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full animate-pulse w-3/4"></div>
                    </div>
                  </div>
                  <p className="text-gray-600">잠시만 기다려주세요...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Download Ready State */
            <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-xl border-amber-200">
              <CardHeader className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full blur-xl opacity-40 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-4 shadow-lg">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  교정 완료! 🎉
                </CardTitle>
                <CardDescription>
                  맞춤법 교정이 완료되었습니다. 수정된 PowerPoint 파일을 다운로드하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    교정된 파일 다운로드
                  </Button>
                  
                  <div className="text-sm text-gray-600">
                    <p>• 원본 파일은 그대로 유지됩니다</p>
                    <p>• 교정된 내용만 새 파일에 적용됩니다</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-800 mb-3">다른 작업 하기</h3>
                  <div className="flex gap-3">
                    <Button
                      onClick={startNewCorrection}
                      variant="outline"
                      className="flex-1 border-amber-200 hover:bg-amber-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      새 파일 교정하기
                    </Button>
                    <Link href="/" className="flex-1">
                      <Button variant="outline" className="w-full border-amber-200 hover:bg-amber-50">
                        홈으로 돌아가기
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}