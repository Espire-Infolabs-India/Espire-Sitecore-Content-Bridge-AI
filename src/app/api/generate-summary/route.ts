import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { Fields, Files } from "formidable";
import fs from "fs";
import path from "path";
import * as pdfParse from "pdf-parse";
import axios from "axios";

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Upload folder
const uploadsDir = path.join(process.cwd(), "public/images/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// PDF parser type
type PDFParseResult = {
  numpages: number;
  numrender: number;
  info: Record<string, any>;
  metadata: Record<string, any>;
  version: string;
  text: string;
};

// Read PDF content
async function readPDFContent(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data: PDFParseResult = await (pdfParse as any)(buffer);
  return data.text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
      // Parse tFields
      let tFields: any = fields?.tFields;
      if (typeof tFields === "string") tFields = JSON.parse(tFields);
      else if (Array.isArray(tFields)) tFields = JSON.parse(tFields[0]);

      const finalFields = tFields?.map((item: any) => ({
        display_name: item?.name,
        name: item?.name,
        type: item?.name,
        section: item?.section,
      }));

      // Handle uploaded PDF
      const file = Array.isArray(files.pdf) ? files.pdf[0] : (files.pdf as any);
      if (!file) {
        return res.status(400).json({ error: "No PDF uploaded" });
      }

      const filePath = file.filepath;
      const fileName = file.newFilename;
      const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
      const PDFLink = `${BASE_URL}/images/uploads/${fileName}`;

      // Extract PDF text
      const pdfContent = await readPDFContent(filePath);
      const truncatedContent = pdfContent.slice(0, 30000);
      console.log("PDF Preview:", truncatedContent.substring(0, 200));

      // Prepare payload for external API
      const data = {
        blob_url: PDFLink,
        user_prompt: "Rewrite in a more engaging style, but maintain all important details.",
        brand_website_url: "https://www.oki.com/global/profile/brand/",
        content_type: JSON.stringify(tFields, null, 2),
      };

      // Send to external API
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