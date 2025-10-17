import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ status: 'fail', message: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define upload path (e.g., /public/uploads)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ status: 'success', fileName: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ status: 'fail', error: (error as Error).message }, { status: 500 });
  }
}
