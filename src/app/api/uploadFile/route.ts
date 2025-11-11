export const runtime = 'nodejs'; // Ensure Buffer works normally

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    


    const formData = await req.formData();

    const file = formData.get('file') as File;
    const presignedUploadUrl = formData.get('presignedUploadUrl') as string;
    const fileData = formData.get('fileData') as string;
    const token = formData.get('token') as string;

     


    const buffer = Buffer.from(fileData, "base64");


    // ✅ Create multipart/form-data
    const uploadForm = new FormData();
    uploadForm.set("image", file); // 👈 must use 'image' field name

    // ✅ Upload to Sitecore Authoring API
    const uploadResponse = await fetch(presignedUploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        'Authorization': `Bearer ${token}`, // if your presigned URL requires it
      },
       body: uploadForm, // 👈 do NOT set Content-Type manually
      //body: fileData,
    });

    const uploadRes = await uploadResponse;

    console.log( {uploadItem: uploadRes});

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

    
    /*



    const arrayBuffer = await file.arrayBuffer();

      const uploadResponse = await fetch(presignedUploadUrl, {
      method: 'POST', // presigned URLs usually expect PUT
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        'Authorization': `Bearer ${token}`, // if your presigned URL requires it
      },
      body: arrayBuffer,
    });
    */