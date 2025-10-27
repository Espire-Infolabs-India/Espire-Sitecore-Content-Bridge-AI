import { NextResponse } from "next/server";
 
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { filename, mime, base64 } = json;
    console.log("[app-router import] filename:", filename);
    console.log("[app-router import] mime:", mime);
    console.log(
      "[app-router import] base64-preview:",
      String(base64 || "").slice(0, 500)
    );
    const id = Date.now().toString();
    return NextResponse.json({ id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}