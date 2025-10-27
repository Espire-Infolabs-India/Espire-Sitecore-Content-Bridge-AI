export const runtime = 'nodejs'; // Ensure Buffer works normally

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // const { fileName, fileData, presignedUploadUrl, token } = await req.json();

    // if (!fileData || !presignedUploadUrl) {
    //   return NextResponse.json(
    //     { error: 'Missing fileData or presignedUploadUrl' },
    //     { status: 400 }
    //   );
    // }

    // // Decode base64 → binary
    // const binary = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

    // // Create FormData for POST upload
    // const formData = new FormData();
    // formData.append('image', new Blob([binary]), fileName);

    // Send file to Sitecore presigned URL



    const formData = await req.formData();

    const file = formData.get('file') as File;
    const presignedUploadUrl = formData.get('presignedUploadUrl') as string;
    const token = formData.get('token') as string;

    const arrayBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(presignedUploadUrl, {
      method: 'POST', // presigned URLs usually expect PUT
      headers: {
        'Content-Type': file.type,
        'Authorization': `Bearer ${token}`, // if your presigned URL requires it
      },
      body: arrayBuffer,
    });


    
    // const uploadResponse = await fetch(presignedUploadUrl, {
    //   method: 'POST', // ✅ Sitecore presigned expects POST
    //   headers: {
    //     authorization: `Bearer ${token}`, // ✅ only if Sitecore requires it
    //   },
    //   body: formData, // ✅ send as multipart/form-data
    // });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      return NextResponse.json(
        { error: 'Upload failed', details: errorText },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully:', uploadResponse);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in uploadFile route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
