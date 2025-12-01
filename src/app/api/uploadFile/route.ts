export const runtime = 'nodejs'; // Ensure Buffer works normally

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {

    const formData = await req.formData();

    const file = formData.get('file') as File;
    const presignedUploadUrl = formData.get('presignedUploadUrl') as string;
    const token = formData.get('token') as string;


    const uploadFormData = new FormData();
    uploadFormData.append('', file);

  
    const uploadResponse = await fetch(presignedUploadUrl, {
      method: "POST",
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: uploadFormData,
    });

    const uploadRes = await uploadResponse.text();

    console.log({ uploadItem: uploadRes });

    if (!uploadResponse.ok) {
      console.error("Upload failed:", uploadRes);
      return NextResponse.json({ error: "Upload failed", details: uploadRes }, { status: uploadResponse.status });
    }
    return NextResponse.json({ success: true, response: uploadRes });
  } catch (err: any) {
    console.error('Unexpected error in uploadFile route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}