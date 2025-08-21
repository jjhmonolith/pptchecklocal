import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { FileStorage } from "@/lib/file-storage";

const JWT_SECRET = process.env.JWT_SECRET || "ppt-spell-checker-secret-key-2024-super-secure";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    console.log("Download API called:", filename);
    
    // Decode file ID (filename parameter is actually fileId)
    const fileId = decodeURIComponent(filename);
    
    // Authentication check
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Initialize file storage
    await FileStorage.init();
    
    // Get file data
    const fileData = await FileStorage.get(fileId);
    if (!fileData) {
      return NextResponse.json(
        { error: "File not found or expired" },
        { status: 404 }
      );
    }
    
    // Read file
    const fileBuffer = await FileStorage.readFile(fileId);
    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Failed to read file" },
        { status: 500 }
      );
    }
    
    console.log(`File download ready: ${Math.round(fileBuffer.length / 1024 / 1024 * 100) / 100}MB`);
    
    // Safe filename (English only)
    const safeFilename = `corrected_presentation_${Date.now()}.pptx`;
    
    // Stream file using ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(fileBuffer);
        controller.close();
      }
    });
    
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-File-Id': fileId,
        'X-Original-Size': fileData.size.toString(),
        'X-Download-Time': new Date().toISOString()
      },
    });

  } catch (error) {
    console.error("Download API error:", error);
    
    // More specific error handling
    let errorMessage = "File download error occurred.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("ENOENT") || error.message.includes("File not found")) {
        errorMessage = "Requested file does not exist.";
        statusCode = 404;
      } else if (error.message.includes("EACCES") || error.message.includes("permission")) {
        errorMessage = "File access permission denied.";
        statusCode = 403;
      } else if (error.message.includes("EMFILE") || error.message.includes("too many open files")) {
        errorMessage = "Cannot open file due to insufficient system resources.";
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        debug: {
          originalError: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      { status: statusCode }
    );
  }
}