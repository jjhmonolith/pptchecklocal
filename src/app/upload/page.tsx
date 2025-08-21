"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push("/auth");
    }
  }, [router]);

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
            <FileText className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold">PPT 맞춤법 검사기</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 border-amber-200 hover:bg-amber-50"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>

        {/* Welcome Card */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-white to-amber-50 border-amber-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              인증이 완료되었습니다! 🎉
            </CardTitle>
            <CardDescription>
              PPT 파일 업로드 기능은 곧 구현될 예정입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              현재 인증 시스템이 정상적으로 작동하고 있습니다.<br />
              다음 단계에서 파일 업로드 기능을 추가하겠습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}