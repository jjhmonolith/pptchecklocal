import { NextRequest, NextResponse } from "next/server";
import { FileStorage } from "@/lib/file-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const fileData = FileStorage.get(id);
    
    if (!fileData) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // base64 데이터를 Buffer로 변환
    const buffer = Buffer.from(fileData.data, 'base64');

    // 파일 응답 반환
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { error: "파일 서빙 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}