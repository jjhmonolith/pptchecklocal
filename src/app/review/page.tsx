"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function ReviewContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }

    const url = searchParams.get("fileUrl");
    if (url) {
      setFileUrl(decodeURIComponent(url));
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/");
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
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

        {/* Content */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-white to-amber-50 border-amber-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              분석 결과 리뷰 🎉
            </CardTitle>
            <CardDescription>
              맞춤법 검사 결과를 검토하고 적용할 수정사항을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <p className="text-gray-600">
                업로드된 파일: {fileUrl ? "✅ 성공" : "❌ 파일 정보 없음"}
              </p>
              <p className="text-gray-600">
                리뷰 페이지 기능은 4단계에서 구현될 예정입니다.<br />
                현재는 파일 업로드 플로우가 정상 작동하는지 확인하는 단계입니다.
              </p>
              {fileUrl && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    파일 URL: {fileUrl}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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