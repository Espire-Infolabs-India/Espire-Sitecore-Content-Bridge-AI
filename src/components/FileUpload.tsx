'use client';
import React, { useState, ChangeEvent } from 'react';
import { ClientSDK } from "@sitecore-marketplace-sdk/client";

interface FileUploadProps {
  client: ClientSDK | null;
  appContext: any;           // Pass appContext from GetMediaItems
  targetPath: string;        // e.g., "/sitecore/media library/Images/Banner"
  onUploadSuccess?: (uploadedItemId: string) => void;
}

// Utility to clean file name for Sitecore
function sanitizeFileName(name: string): string {
  // Remove invalid Sitecore item name characters
  const invalidChars = /[\\\/:\?"<>|\[\]]/g;
  // Replace with dash or empty string
  return name.replace(invalidChars, '-');
}


export const FileUpload: React.FC<FileUploadProps> = ({ client, appContext, targetPath, onUploadSuccess }) => {

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const toBase64 = (file: File) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  const handleUpload = async () => {
    if (!file || !client || !appContext) {
      setMessage('Select a file and ensure client/appContext are available.');
      return;
    }
    setUploading(true);
    setMessage('');
    try {

      const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;
      if (!sitecoreContextId) throw new Error("Sitecore context not found");

      const base64 = await toBase64(file);
      console.log("Base64:", base64);


      // ✅ GraphQL mutation
      const cleanFileName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")); // no extension, no bad chars
      console.log("Clean File Name:", cleanFileName);

      // Extract clean file name (without extension)
      const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
      const itemDirectory = "Default Website";
      const itemPath = `${itemDirectory}/${fileName}`;
      const overwriteExisting = true;
console.log("Item Path:", itemPath);
      // Define GraphQL mutation for Edge Authoring
      const mutation = {
        query: `
          mutation UploadMedia($itemPath: String!, $overwriteExisting: Boolean!) {
            uploadMedia(input: { itemPath: $itemPath, overwriteExisting: $overwriteExisting }) {
              presignedUploadUrl
            }
          }
        `,
        variables: {
          itemPath,
          overwriteExisting
        }
      };

      await client?.mutate("xmc.authoring.graphql", {
        params: {
          query: { sitecoreContextId },
          body: mutation,
        },
        onSuccess: async (data: any) => {
          const presignedUploadUrl = data?.data?.data?.uploadMedia?.presignedUploadUrl;

          if (!presignedUploadUrl) {
            console.error("❌ No presigned upload URL returned");
            return;
          }
          /* Token */
          const tokenResponse = await fetch('/api/getToken');
          const tokenJson = await tokenResponse.json();
          const token = tokenJson.access_token; 


          const formData = new FormData();
          formData.append('file', file); // actual File object
          formData.append('presignedUploadUrl', presignedUploadUrl);
          formData.append('fileData', base64 as string);          
          formData.append('token', token);
          
          const result = await fetch('/api/uploadFile', {
            method: 'POST',
            body: formData,  
          });

          console.log("Upload Result:", result);

        },
        onError: (error: any) => {
          console.error("❌ GraphQL query failed:", error);
        },
      });

      setMessage(`File uploaded successfully: ${file.name}`);

    } catch (error) {
      console.error(error);
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
     

<div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
  {/* File Input */}
  <label className="flex flex-col sm:flex-row items-center justify-center w-full sm:w-auto cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg px-4 py-2 transition-all duration-200">
    <span className="text-sm text-gray-600">
      {file ? file.name : "Choose file"}
    </span>
    <input type="file" onChange={handleFileChange} className="hidden" />
  </label>

  {/* Upload Button */}
  <button
    onClick={handleUpload}
    disabled={uploading || !file}
    className={`px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-all duration-200 ${
      uploading || !file
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }`}
  >
    {uploading ? "Uploading..." : "Upload"}
  </button>

  {/* Status Message */}
  {message && (
    <p className="text-sm text-gray-700 mt-2 sm:mt-0 sm:ml-2 italic">
      {message}
    </p>
  )}
</div>

  );
};