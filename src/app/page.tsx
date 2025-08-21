import { FileText, Shield, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            <FileText className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-4xl font-bold">PPT 맞춤법 검사기</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            PowerPoint 교재를 AI로 자동 교정하는 웹 애플리케이션입니다.
            업로드, 검토, 다운로드까지 간편하게!
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-lg">보안 인증</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                패스워드 기반 보안으로 안전한 파일 처리
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-lg">파일 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                PowerPoint(.pptx) 파일을 간편하게 업로드
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-lg">AI 검사</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                맞춤법, 띄어쓰기, 문법을 AI로 자동 검사
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Download className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-lg">자동 다운로드</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                교정된 PowerPoint 파일 자동 다운로드
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/auth">
            <Button size="lg" className="text-lg px-8 py-6">
              시작하기 →
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            먼저 패스워드 인증을 진행해주세요
          </p>
        </div>

        <div className="mt-16 p-8 bg-muted rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">사용 방법</h2>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">1</div>
              <h3 className="font-medium mb-2">로그인</h3>
              <p className="text-sm text-muted-foreground">패스워드를 입력하여 인증</p>
            </div>
            <div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">2</div>
              <h3 className="font-medium mb-2">업로드</h3>
              <p className="text-sm text-muted-foreground">PowerPoint 파일 업로드</p>
            </div>
            <div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">3</div>
              <h3 className="font-medium mb-2">검토</h3>
              <p className="text-sm text-muted-foreground">교정 제안사항 검토 및 선택</p>
            </div>
            <div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">4</div>
              <h3 className="font-medium mb-2">다운로드</h3>
              <p className="text-sm text-muted-foreground">교정된 파일 자동 다운로드</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
