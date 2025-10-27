import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { Fields, Files } from "formidable";
import fs from "fs";
import path from "path";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Disable Next.js body parser
export const config = { api: { bodyParser: false } };

// Upload folder
const uploadsDir = path.join(process.cwd(), "public/images/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Helper: Read PDF text using pdfjs-dist
async function readPDFContent(filePath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let textContent = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const text = await page.getTextContent();
    const pageText = text.items.map((item: any) => item.str).join(" ");
    textContent += pageText + "\n";
  }

  return textContent;
}

// Main handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST"){
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log('______________req.method',req.method,req.body.tFields);

  const form = new formidable.IncomingForm({
    uploadDir: uploadsDir,
    keepExtensions: true,
  });

  form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Failed to parse form data" });
    }

    try {
      const file = Array.isArray(files.pdf) ? files.pdf[0] : (files.pdf as any);
      if (!file) return res.status(400).json({ error: "No PDF uploaded" });

      const filePath = file.filepath;
      const fileName = file.newFilename;
      const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
      const PDFLink = `${BASE_URL}/images/uploads/${fileName}`;

      // Use pdfjs to extract text
      const pdfContent = await readPDFContent(filePath);
      const truncatedContent = pdfContent.slice(0, 30000);
      console.log("PDF Preview:", truncatedContent.substring(0, 200));

      // Parse tFields
      let tFields: any[] = [];
      const tFieldsRaw = fields.tFields;
      if (typeof tFieldsRaw === "string") tFields = JSON.parse(tFieldsRaw);
      else if (Array.isArray(tFieldsRaw)) tFields = JSON.parse(tFieldsRaw[0]);

      const finalFields = tFields.map((item) => ({
        display_name: item?.name,
        name: item?.name,
        type: item?.name,
        section: item?.section,
      }));

      const data = {
        blob_url: PDFLink,
        user_prompt: "Rewrite in a more engaging style, but maintain all important details.",
        brand_website_url: "https://www.oki.com/global/profile/brand/",
        content_type: JSON.stringify(tFields, null, 2),
      };

      const response = await axios.post(
        process.env.CHATBOT_CUSTOM_API_END_POINT as string,
        data,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHATBOT_CUSTOM_API_KEY}`,
            "Content-Type": "application/json",
            api_key: process.env.CHATBOT_CUSTOM_API_KEY,
          },
        }
      );

      return res.status(200).json({ summary: response.data });
    } catch (error: any) {
      console.error("Handler error:", error);
      return res.status(500).json({
        summary: { result: [] },
        error: error.message || "Unexpected server error",
      });
    }
  });
}