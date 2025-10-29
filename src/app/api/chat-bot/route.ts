import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { uploadedFileName, tFields, prompt, brandWebsite } = await req.json();
    let filteredTFields = tFields?.filter((item:any) => item.type == 'Single-Line Text' || item.type == 'Rich Text');

    // interface ResultItem {
    //   name: string;
    //   display_name: string;
    //   reference: string;
    //   type: string;
    //   section: string;
    //   value: string;
    // }

    // interface ResponseType {
    //   data: {
    //     result: ResultItem[];
    //   };
    // }

    // var response1: ResponseType = {
    //   data: {
    //     result: [
    //               {
    //                   "section": "Promo",
    //                   "name": "PromoText",
    //                   "display_name": "PromoText",
    //                   "reference": "Promo_PromoText",
    //                   "type": "Rich Text",
    //                   "value": "api test value"
    //               },
    //               {
    //                   "section": "Promo",
    //                   "name": "PromoLink",
    //                   "type": "General Link",
    //                   "display_name": "PromoText",
    //                   "reference": "Promo_PromoLink",
    //                   "value": "api link test value"
    //               },
    //               {
    //                   "section": "Promo",
    //                   "name": "PromoText2",
    //                   "type": "Rich Text",
    //                   "display_name": "PromoText",
    //                   "reference": "Promo_PromoText2",
    //                   "value": "api test value"
    //               }
    //           ]
    //   }
    // };
    
    // let apiresponse = response1?.data?.result;
    // let finalResponse =  tFields?.map((item: any) => {
    //   let match = apiresponse.find((obj: any) => obj?.reference?.toLowerCase() == item?.section?.toLowerCase()+'_'+item?.name?.toLowerCase());
    //   if(match){
    //     return {...item, ...match};
    //   }else{
    //     item.value = "";
    //     return item;
    //   }
    // });
    // console.log('final.............',finalResponse);
    // return NextResponse.json({ success: true, data: {result: finalResponse} });

    const newtFields = filteredTFields
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
      reference: item.section+'_'+item.name,
      type: item.type,
      section: item.section,
    }));


    //console.log('____________newtFields in server',newtFields);

    const payload = {
      blob_url:uploadedFileName,
      user_prompt: prompt || "Rewrite in a more engaging style, but maintain all important details.",
      brand_website_url: brandWebsite || "https://www.oki.com/global/profile/brand/",
      content_type: JSON.stringify(newtFields, null, 2),
    };

    console.log('____________payload in server',payload);

    const response = await axios.post(process.env.CHATBOT_CUSTOM_API_END_POINT || "", payload, {
      headers: {
            Authorization: `Bearer ${process.env.CHATBOT_CUSTOM_API_KEY}`,
            "Content-Type": "application/json",
            api_key: process.env.CHATBOT_CUSTOM_API_KEY!,
      },
    });

    

    console.log('____________response in server',response?.data);

      if(response?.data?.result && response?.data?.result?.length > 0){
        let apiresponse = response?.data?.result;
        let finalResponse =  tFields?.map((item: any) => {
          let match = apiresponse.find((obj: any) => obj?.reference?.toLowerCase() == item?.section?.toLowerCase()+'_'+item?.name?.toLowerCase());
          if(match){
            return {...item, ...match};
          }else{
            item.value = "";
            return item;
          }
        });

      return NextResponse.json({ success: true, data: {result: finalResponse} });
    }else{
      return NextResponse.json({ success: true, data: {result: []} });
    }


    
  } catch (err: any) {
    console.error("Third-party request failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}