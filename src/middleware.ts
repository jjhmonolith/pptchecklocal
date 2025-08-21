import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024";

export function middleware(request: NextRequest) {
  // 보호된 경로들
  const protectedPaths = ["/upload", "/review", "/download"];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 쿠키 또는 헤더에서 토큰 확인
  const token = request.cookies.get("auth-token")?.value || 
                request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  try {
    verify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
}

export const config = {
  matcher: [
    "/upload/:path*",
    "/review/:path*", 
    "/download/:path*"
  ],
};