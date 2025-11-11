export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const cleanFileName = formData.get('cleanFileName') as string;
    const token = formData.get('token') as string;

    if (!cleanFileName || !token) {
      return NextResponse.json(
        { error: 'Missing cleanFileName or token' },
        { status: 400 }
      );
    }

    const mutation = `
      mutation UploadMedia($input: UploadMediaInput!) {
        uploadMedia(input: $input) {
          presignedUploadUrl
        }
      }
    `;

    const input = {
      itemPath: `Default Website/${cleanFileName}`,
      alt: cleanFileName,
      language: "en",
      overwriteExisting: true,
      includeExtensionInItemName: false,
      database: "master",
      versioned: false,
    };

    const response = await fetch(
      "https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/api/authoring/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { input },
        }),
      }
    );

    // 👇 Safely read response
    const text = await response.text();
    console.log("GraphQL raw response:", text);

    // If response is HTML (likely redirect or auth issue)
    if (text.startsWith("<!DOCTYPE")) {
      return NextResponse.json(
        { error: "Received HTML instead of JSON. Invalid endpoint or token." },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return NextResponse.json({ error: data.errors }, { status: 500 });
    }

    const presignedUploadUrl = data?.data?.uploadMedia?.presignedUploadUrl;

    if (!presignedUploadUrl) {
      return NextResponse.json(
        { error: "No presigned URL returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      presignedUploadUrl,
    });
  } catch (error: any) {
    console.error("UploadMedia route error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
