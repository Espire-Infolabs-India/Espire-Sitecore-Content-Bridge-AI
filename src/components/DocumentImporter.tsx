"use client";
import React, { useRef, useState } from "react";
import styles from "./DocumentImporter.module.css";
import GetPageTemplates from "./GetPageTemplates";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  base64: string;
  original?: File | null;
};

interface DocumentImporterProps {
  appContext: any;
  client: ClientSDK | null;
}

export default function DocumentImporter({
  appContext,
  client,
}: DocumentImporterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPageTemplates, setShowPageTemplates] = useState(false);

  const readFileAsBase64 = (file: File): Promise<string | ArrayBuffer | null> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(file);
    });

  const handleFileObject = async (f?: File | null) => {
    if (!f) return;
    setLoading(true);
    try {
      const dataUrl = await readFileAsBase64(f);
      const base64 = String(dataUrl).split(",")[1] || "";
      setFile({
        name: f.name,
        size: f.size,
        type: f.type,
        base64,
        original: f,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) handleFileObject(dropped);
  };

  const onChooseClick = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleFileObject(e.target.files?.[0] ?? null);

  const handleImport = () => {
    if (!file) return alert("Please upload a file first.");
    setShowPageTemplates(true);
  };

  const reset = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (showPageTemplates) {
    return (
      <GetPageTemplates
        appContext={appContext}
        client={client}
        uploadedFile={file}
      />
    );
  }

  return (
    <div className={`${styles.container} max-w-5xl mx-auto p-6`}>
      <h1>Screen 1</h1>
      <h3 className="text-2xl font-semibold mb-4">Content Bridge AI</h3>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden p-6">
        <div
          className="border-dashed border-2 rounded-md h-48 flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-gray-50"
          onClick={onChooseClick}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p>Drag & drop or choose file to upload</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf, .docx, .doc, .txt"
            onChange={onInputChange}
            className="hidden"
          />
        </div>

        {/* File details */}
        <div className="mt-4">
          {file ? (
            <div className="flex justify-between items-center border p-2 rounded">
              <div>
                <div>{file.name}</div>
                <div className="text-sm text-gray-500">
                  {Math.round(file.size / 1024)} KB
                </div>
              </div>
              <button
                onClick={reset}
                className="text-red-500 hover:underline text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No file selected</p>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end mt-6 space-x-2">
          <button onClick={reset} className="border px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className={`bg-indigo-600 text-white px-4 py-2 rounded ${
              !file ? "opacity-50" : ""
            }`}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}