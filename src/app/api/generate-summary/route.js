import { NextResponse } from "next/server";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import axios from "axios";
import { Readable } from "stream";

export const runtime = "nodejs";

export const config = {
  api: { bodyParser: false },
};

const isVercel = process.env.VERCEL === "1";
const uploadsDir = isVercel
  ? "/tmp"
  : path.join(process.cwd(), "public/images/uploads");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

async function readPDFContent(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

// ✅ Helper to convert Next.js Request -> Node-style stream + headers
function toNodeRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  nodeReq.url = req.url;
  return nodeReq;
}

export async function POST(req) {



  const form = new IncomingForm({
    uploadDir: uploadsDir,
    keepExtensions: true,
  });

  return new Promise((resolve) => {
      resolve(
        NextResponse.json({
          summary: {
              "result": [
                  {
                      "display_name": "Title",
                      "reference": "Slides.Title",
                      "value": "test value coming from ai"
                  }
              ]
              
          },
        })
    );
    // static code end

    const nodeReq = toNodeRequest(req);

    form.parse(nodeReq, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        resolve(
          NextResponse.json(
            { error: "Failed to parse form data" },
            { status: 500 }
          )
        );
        return;
      }

      let tFields = fields?.tFields;
      tFields = JSON.parse(tFields)
      let finalFields = tFields?.map((item) => {
          let newItem = {};
          newItem.display_name = item?.name;
          newItem.type = item?.name;
          newItem.section = item.section;
          return newItem;
      });
      console.log('___________________JSON.stringify_____________________',finalFields);

      const file = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
      let PDFLink = "";

      if (file?.mimetype === "application/pdf") {
        const filePath = file.filepath;
        const fileName = file.newFilename;

        PDFLink = `${process.env.BASE_URL || "http://localhost:3000"}/images/uploads/${fileName}`;

        const pdfContent = await readPDFContent(filePath);
        const truncatedContent = pdfContent.slice(0, 30000);
      }

      const data = {
        blob_url: PDFLink,
        user_prompt: "Rewrite in a more engaging style, but maintain all important details.",
        brand_website_url: "https://www.oki.com/global/profile/brand/",
        content_type: JSON.stringify(tFields, null, 2),
      };

      try {
        const response = await axios.post(
          process.env.CHATBOT_CUSTOM_API_END_POINT,
          data,
          {
            headers: {
              "Authorization":`Bearer ${process.env.CHATBOT_CUSTOM_API_KEY}`,
              "Content-Type": "application/json",
              "api_key": process.env.CHATBOT_CUSTOM_API_KEY
            },
          }
        );

        resolve(
          NextResponse.json({
            summary: response?.data,
          })
        );
      } catch (error) {
        console.error("Handler error:", error);
        resolve(
          NextResponse.json(
            { 
              summary: {
                  "summary": {
                      "result": []
                  }
              },
              error: error.message || "Unexpected server error" 
            },
            { status: 500 }
          )
        );
      }
    });
  });
}
