import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { selectedFile, tFields, prompt, brandWebsite } = await req.json();
    let filteredTFields = tFields?.filter((item:any) => item.type == 'Single-Line Text' || item.type == 'Rich Text' || item.type == 'Multi-Line Text');

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
    //       data: {
    //               "result": [
    //                 {
    //                     "name": "Title",
    //                     "type": "Single-Line Text",
    //                     "section": "BaseTemplate",
    //                     "value": "Espire's Enterprise Solutions: Designed to Streamline, Modernize, and Scale Business Operations Efficiently",
    //                     "display_name": "Title",
    //                     "reference": "BaseTemplate_Title"
    //                 },
    //                 {
    //                     "name": "Content",
    //                     "type": "Rich Text",
    //                     "section": "BaseTemplate",
    //                     "value": "Espire's solutions encompass ERP, CRM, SCM, and HCM systems, focused on elevating digital experiences, driving constant innovation, and boosting ROI. These enterprise applications unify business processes across departments, promoting seamless data flow, enhanced operational efficiency, and informed decision-making. With Espire's blend of in-depth industry expertise, certified specialists, and established integration practices, businesses can reinvent their core operations through scalability, customization, integration, and automation.",
    //                     "display_name": "Content",
    //                     "reference": "BaseTemplate_Content"
    //                 },
    //                 {
    //                     "name": "MetaKeywords",
    //                     "type": "Multi-Line Text",
    //                     "section": "BaseTemplate",
    //                     "value": "Espire, enterprise solutions, ERP, CRM, SCM, HCM, digital transformation, innovation, ROI, business integration, scalability, automation",
    //                     "display_name": "MetaKeywords",
    //                     "reference": "BaseTemplate_MetaKeywords"
    //                 },
    //                 {
    //                     "name": "MetaDescription",
    //                     "type": "Multi-Line Text",
    //                     "section": "BaseTemplate",
    //                     "value": "Espire's integration architects harness iPaaS, microservices, and event-streaming technologies to effectively link enterprise applications with external third-party networks, ensuring smooth connectivity and enhanced performance.",
    //                     "display_name": "MetaDescription",
    //                     "reference": "BaseTemplate_MetaDescription"
    //                 }
    //             ]
    //   }
    // };

    // var response1: ResponseType = {
    //       data: {
    //               "result": [
    //                 {
    //                   "section": "Promo",
    //                   "name": "PromoText",
    //                   "type": "Rich Text",
    //                   "value": "Espire's enterprise solutions are engineered to streamline, modernize, and scale business operations. This includes advanced ERP, CRM, SCM, and HCM systems, all focused on elevating digital experiences, promoting ongoing innovation, and speeding up ROI. By integrating business processes across departments, we enhance data flow, boost operational efficiency, and support better decision-making. Espire leverages extensive domain expertise, certified specialists, and proven integration methods to help businesses reinvent their core operations with scalability, seamless integration, customization, and automation.",
    //                   "display_name": "PromoText",
    //                   "reference": "Promo_PromoText"
    //               },
    //               {
    //                   "section": "Promo",
    //                   "name": "PromoText2",
    //                   "type": "Rich Text",
    //                   "value": "Espire's expertise covers key areas like ERP, offering cloud-first, AI-ready systems that unify finance, supply chain, HR, projects, and customer operations for data-driven decisions and growth. In CRM, our solutions manage customer interactions to improve service, drive sales, and enhance retention. SCM systems optimize the flow of goods, information, and finances from sourcing to delivery. For insurance, we support full-spectrum operations, ensuring compliance and innovation, while HCM platforms manage the entire employee lifecycle for organizational success.",
    //                   "display_name": "PromoText2",
    //                   "reference": "Promo_PromoText2"
    //               },
    //               {
    //                   "section": "Promo",
    //                   "name": "PromoText3",
    //                   "type": "Rich Text",
    //                   "value": "Espire delivers a full range of services, including advisory and transformation planning, complete implementation and customization, integration with API connectivity, upgrades, cloud migration, ongoing support, data analytics, and user training. Our advisory team performs maturity assessments, process mapping, and ROI modeling to align technology with business goals. Certified consultants configure robust applications, while integration experts use iPaaS and microservices for seamless connections. We provide upgrades, managed support, and analytics for real-time insights, along with change management strategies like e-learning and gamified campaigns to ensure user adoption and continuous improvement.",
    //                   "display_name": "PromoText3",
    //                   "reference": "Promo_PromoText3"
    //               }
    //             ]
    //   }
    // };

    // let apiresponse = response1?.data?.result;
    // let finalResponse = tFields.reduce((acc: any[], item: any) => {
    //   const match = apiresponse.find((obj: any) =>
    //     obj?.reference?.toLowerCase() ===
    //     `${item?.section?.toLowerCase()}_${item?.name?.toLowerCase()}`
    //   );
    
    //   if (match) {
    //     acc.push({ ...item, ...match });
    //   }
    
    //   // if no match, just continue
    //   return acc;
    // }, []);
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

    const payload = {
      blob_url:selectedFile,
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
        let finalResponse = tFields.reduce((acc: any[], item: any) => {
          const match = apiresponse.find((obj: any) =>
            obj?.reference?.toLowerCase() ===
            `${item?.section?.toLowerCase()}_${item?.name?.toLowerCase()}`
          );
        
          if (match) {
            acc.push({ ...item, ...match });
          }
        
          // if no match, just continue
          return acc;
        }, []);

      return NextResponse.json({ success: true, data: {result: finalResponse} });
    }else{
      return NextResponse.json({ success: true, data: {result: []} });
    }
  } catch (err: any) {
    console.error("Third-party request failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}