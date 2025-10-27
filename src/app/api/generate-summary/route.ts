import { NextResponse } from "next/server";
import formidable, { File } from "formidable";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { IncomingMessage } from "http"; // 👈 important

export const config = { api: { bodyParser: false } };

// Ensure upload dir exists
const ensureUploadDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Convert Web Request → mock IncomingMessage (Node-compatible)
async function toNodeRequest(req: Request): Promise<IncomingMessage> {
  const body = Buffer.from(await req.arrayBuffer());
  const readable = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });

  // Cast and add required Node props
  const nodeReq = readable as unknown as IncomingMessage;
  nodeReq.headers = Object.fromEntries(req.headers) as Record<string, string>;
  nodeReq.method = req.method;
  nodeReq.url = req.url;

  return nodeReq;
}

export async function POST(req: Request) {
  try {
    const uploadDir = path.join(process.cwd(), "public/uploads");
    ensureUploadDir(uploadDir);

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      multiples: false,
    });

    const nodeReq = await toNodeRequest(req);

    const { filePath } = await new Promise<{ filePath: string }>((resolve, reject) => {
      form.parse(nodeReq, (err, fields, files) => {
        if (err) return reject(err);

        const uploaded = files.file as File | File[] | undefined;
        if (!uploaded) return reject(new Error("No file uploaded"));

        const fileObj = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        if (!fileObj?.filepath) return reject(new Error("File path missing"));

        resolve({ filePath: fileObj.filepath });
      });
    });

    const fileName = path.basename(filePath);
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const BASE_URL = `${proto}://${host}`;
    const publicUrl = `${BASE_URL}/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      blob_url: publicUrl,
    });
  } catch (err: any) {
    console.error("Upload failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}