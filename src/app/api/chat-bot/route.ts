import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { blob_url, tFields } = await req.json();
    console.log('____________tFields',tFields);
    
    const newtFields = tFields
    .filter((item: { reference: any; }) => !item.reference) // only include items WITHOUT 'reference'
    .map((item: {
      section: any;
      type: any;
      reference: any;
      shortDescription: any;
      display_name: any;
      name: any;
    }) => ({
      name: item.name,
      display_name: item.shortDescription || item.name,
      type: item.type,
      section: item.section,
    }));


    console.log('____________newtFields in server',newtFields);

    const payload = {
      blob_url,
      user_prompt: "Rewrite in a more engaging style, but maintain all important details.",
      brand_website_url: "https://www.oki.com/global/profile/brand/",
      content_type: JSON.stringify(newtFields, null, 2),
    };

    const response = await axios.post(process.env.CHATBOT_CUSTOM_API_END_POINT || "", payload, {
      headers: {
            Authorization: `Bearer ${process.env.CHATBOT_CUSTOM_API_KEY}`,
            "Content-Type": "application/json",
            api_key: process.env.CHATBOT_CUSTOM_API_KEY!,
      },
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (err: any) {
    console.error("Third-party request failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}