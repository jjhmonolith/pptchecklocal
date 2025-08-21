import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";

const SECRET_PASSWORD = process.env.AUTH_PASSWORD || "ppt-checker-2024";
const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "패스워드를 입력해주세요." },
        { status: 400 }
      );
    }

    if (password !== SECRET_PASSWORD) {
      return NextResponse.json(
        { error: "잘못된 패스워드입니다." },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = sign(
      { 
        authenticated: true,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const response = NextResponse.json(
      { 
        message: "인증 성공",
        token 
      },
      { status: 200 }
    );

    // HTTP-only 쿠키로도 설정 (이중 보안)
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24시간
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}