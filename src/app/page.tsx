"use client";

import { FileText, Shield, CheckCircle, Download, Sparkles, ArrowRight, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(251, 191, 36, 0.15) 0%, transparent 40%)`,
        }}
      />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-8 animate-pulse">
            <Sparkles className="h-4 w-4" />
            AI 기반 스마트 교정
          </div>
          
          <div className="flex justify-center items-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-amber-300 to-orange-300 opacity-30 animate-pulse" />
              <FileText className="h-20 w-20 text-amber-500 relative animate-bounce" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold ml-6 bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              PPT 맞춤법 검사기
            </h1>
          </div>
          
          <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            당신의 프레젠테이션을 더욱 <span className="text-amber-500 font-semibold">완벽하게</span> 만들어드립니다.
            <br />
            <span className="text-lg text-gray-500">AI가 자동으로 맞춤법과 문법을 교정해드려요!</span>
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-amber-50 border-amber-200">
            <CardHeader>
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-gray-800">보안 인증</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                안전한 패스워드 인증으로<br />소중한 파일을 보호합니다
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-orange-50 border-orange-200">
            <CardHeader>
              <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-gray-800">간편한 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                드래그 앤 드롭으로<br />PowerPoint 파일을 업로드
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-yellow-50 border-yellow-200">
            <CardHeader>
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-2xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-gray-800">AI 스마트 검사</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                최신 AI 기술로<br />정확한 맞춤법 검사
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-amber-50 border-amber-200">
            <CardHeader>
              <div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-2xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Download className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-gray-800">즉시 다운로드</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                교정된 파일을<br />바로 다운로드 가능
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mb-20">
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-40 animate-pulse" />
            <Link href="/auth">
              <Button 
                size="lg" 
                className="relative text-lg px-10 py-7 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl"
              >
                지금 시작하기
                <ArrowRight className="ml-3 h-5 w-5 animate-pulse" />
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-gray-500">
            완전 무료! 회원가입 없이 바로 사용 가능합니다
          </p>
        </div>

        {/* How to Use */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-10 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              쉽고 빠른 4단계
            </span>
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "로그인", desc: "패스워드 입력", icon: Shield },
              { step: "2", title: "업로드", desc: "PPT 파일 선택", icon: FileText },
              { step: "3", title: "검토", desc: "교정 내용 확인", icon: CheckCircle },
              { step: "4", title: "다운로드", desc: "수정 파일 저장", icon: Download },
            ].map((item, index) => (
              <div key={index} className="relative group">
                {index < 3 && (
                  <div className="hidden md:block absolute top-10 left-full w-full">
                    <ArrowRight className="text-amber-300 h-8 w-8 -ml-4" />
                  </div>
                )}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-20">
          <p className="text-gray-500 flex items-center justify-center gap-2">
            Made with <Heart className="h-4 w-4 text-red-500 animate-pulse" /> for better presentations
          </p>
        </div>
      </div>
    </div>
  );
}