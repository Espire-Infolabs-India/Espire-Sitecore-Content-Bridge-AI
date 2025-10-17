// File: app/api/import/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: { json: () => any; }) {
  try {
    const json = await request.json();
    const { filename, mime, base64 } = json;
    const id = Date.now().toString();
    return NextResponse.json({ id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}