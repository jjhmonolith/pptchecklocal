"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Lock, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AuthPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      console.log("Auth response:", { status: response.status, data });

      if (response.ok) {
        console.log("✅ Auth successful, token:", data.token);
        localStorage.setItem("authToken", data.token);
        console.log("✅ Token saved to localStorage");
        
        // Next.js router 사용
        console.log("🔄 Redirecting to /upload");
        router.push("/upload");
      } else {
        console.log("Auth failed:", data);
        setError(data.error || "인증에 실패했습니다.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(251, 191, 36, 0.15) 0%, transparent 40%)`,
        }}
      />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            홈으로 돌아가기
          </Link>

          {/* Main Card */}
          <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm shadow-2xl border-amber-200">
            <CardHeader className="text-center pb-8">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-xl opacity-40 animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-4 shadow-lg">
                  <Shield className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                보안 인증
              </CardTitle>
              <CardDescription className="text-gray-600">
                PPT 맞춤법 검사기에 오신 것을 환영합니다!<br />
                계속하려면 패스워드를 입력해주세요.<br />
                <span className="text-amber-600 font-medium text-sm">패스워드: ppt-checker-2024</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    패스워드
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="패스워드를 입력하세요"
                      className="pr-12 h-12 bg-white/80 border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {password === "ppt-checker-2024" ? "인증 성공! 페이지 이동 중..." : "인증 중..."}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      로그인
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <Shield className="h-4 w-4 inline mr-2" />
                    패스워드는 안전하게 암호화되어 처리됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info section */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              패스워드를 잊으셨나요?{" "}
              <span className="text-amber-600">관리자에게 문의하세요.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}