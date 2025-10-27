import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { json } from 'stream/consumers';

export async function POST(req: Request) {
   try {
    // ✅ Parse JSON body
    const { itemPath, token  } = await req.json();

    const endpointUrl = 'https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/api/authoring/graphql/v1/';
    const jwt = process.env.SITECORE_JWT!;

    const query = `
      mutation {
        uploadMedia(input: { itemPath: "${itemPath}" }) {
          presignedUploadUrl
        }
      }
    `;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();



    console.log("Avinash   Response from Sitecore GraphQL:", data,JSON.stringify({ query }));
    const presignedUploadUrl = data?.data?.uploadMedia?.presignedUploadUrl;

    return new Response(JSON.stringify({ presignedUploadUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
