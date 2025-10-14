import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { template, pdfFile } = body;

    console.log("📥 Received API Payload:");
    console.log("Template:", template?.name);
    console.log("File Name:", pdfFile?.name);
    console.log("File Type:", pdfFile?.type);
    console.log("File Size:", pdfFile?.size, "bytes");

    return NextResponse.json({
      status: "success",
      message: `Received PDF "${pdfFile.name}" for template "${template.name}"`,
      sizeKB: Math.round(pdfFile.size / 1024),
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}