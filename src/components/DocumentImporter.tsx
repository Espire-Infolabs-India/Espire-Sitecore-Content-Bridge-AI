"use client";
import React, { useRef, useState } from "react";
import Image from 'next/image';
import styles from "./DocumentImporter.module.css";
import GetPageTemplates from "./GetPageTemplates";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import Settings from "./Settings";
import upload from "../images/upload.png";
import { PutBlobResult } from "@vercel/blob";

type UploadedFile = {
  name: string;
  size: number;
  type: string;
  base64: string;
  original?: File | null;
  content?: string;
};

export default function DocumentImporter({
  appContext,
  client,
}: {
  appContext: any;
  client: ClientSDK | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showPageTemplates, setShowPageTemplates] = useState(false);
  const [promptValue, setPromptValue] = useState<string>("Rewrite in a more engaging style, but maintain all important details.");
  const [brandWebsite, setBrandWebsite] = useState<string>("https://www.oki.com/global/profile/brand/");
  const [uploadedFileName, setUploadedFileName] = useState<string>("https://olrnhwkh9qc8dffa.public.blob.vercel-storage.com/Espire%20Blog%20AI%20Sample%20Content.pdf");
  const [isModalOpen, setModalOpen] = useState(false);

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
      setSelectedFile(f);

      const fileDetails = f;
      const response = await fetch(
        `/api/upload?filename=${fileDetails?.name}`,
        {
          method: 'POST',
          body: fileDetails,
        },
      );
      const blob_url = (await response.json()) as PutBlobResult;
      setUploadedFileName(blob_url.url);
      
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

  const handleImport = async () => {
    setShowPageTemplates(true);
  };

  const reset = () => {
    setFile(null);
    setLoading(false);
    setImporting(false);
    inputRef.current && (inputRef.current.value = "");
  };

  if (showPageTemplates) {
    return <GetPageTemplates appContext={appContext} client={client} selectedFile={uploadedFileName} prompt={promptValue} brandWebsite={brandWebsite} />;
  }

  const getPromptValue = (e: React.SyntheticEvent) => {
    setPromptValue((e.target as HTMLInputElement).value);
  };

  const getBrandWebsite = (e: React.SyntheticEvent) => {
    setBrandWebsite((e.target as HTMLInputElement).value);
  };

  return (
    <div className={`${styles.container} max-w-5xl mx-auto p-6`}>
      <Settings prompt={promptValue} brandWebsite={brandWebsite} setPromptValue={getPromptValue} setBrandWebsite={getBrandWebsite} />
      <h1>Screen 1</h1>
      <h3 className={`${styles.title} text-2xl font-semibold mb-4 text-center`}>
        Content Bridge AI
      </h3>
      <div
        className={`${styles.card} border rounded-lg bg-white shadow-sm overflow-hidden document_importer_wrapper `}
      >
        <div
          className={`${styles.cardInner} md:flex md:items-start md:gap-6 p-6 document_importer_inner`}
        >
          {/* Drag & Drop Area */}
          <div
            className={styles.left}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={onChooseClick}
              className={`${styles.dropArea
                } document_importer_button relative rounded-md h-48 flex flex-col items-center justify-center p-6 cursor-pointer transition-colors 
                ${loading ? "opacity-70" : "hover:bg-gray-50"}`}
            >
              <Image src={upload}
                alt="upload image"
                width={30}
                height={30}
              />
              <div className={`${styles.dropNote} document_importer_note`}>Drag & drop or</div>
              <div
                className={`${styles.previewText} mt-2 text-sm text-gray-700 document_importer_text`}
              >
                <strong className="text-indigo-600 document_importer_choosefile">Choose File</strong> to
                upload
              </div>
              <div
                className={`${styles.supportText} italic mt-1 text-xs text-gray-400 document_importer_text`}
              >
                Supported formats: PDF, DOCX, DOC, TXT
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf, .docx, .doc, .txt"
                onChange={onInputChange}
                className={styles.hiddenInput}
              />
              {loading && (
                <div className={styles.loadingOverlay}>
                  <div className="flex items-center gap-2">
                    <div className={`${styles.spinner} h-5 w-5`} />
                    <span className="text-sm text-gray-600">Loading file…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Selected File details */}
            <div className="mt-4 px-2 flex justify-between items-center">
              {file ? (
                <div className={`${styles.fileBox}text-sm document_importer_filename`}>
                  <div>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>
                      {Math.round(file.size / 1024)} KB
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={reset}
                      className={`${styles.btn} ${styles.cancelBtn} document_importer_removebutton`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-base text-gray-500">No file selected</div>
              )}
              {/* Footer Buttons */}
              <div className={`${styles.footer} document_importer_footer`}>
                <button
                  onClick={reset}
                  className={`${styles.btn} ${styles.cancelBtn}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading || importing}
                  className={`${styles.importBtn} ${!file || loading || importing ? styles.disabled : ""
                    } document_importer`}
                >
                  {importing ? (
                    <>
                      <span className={styles.spinner} />
                      Importing…
                    </>
                  ) : (
                    "Import"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
