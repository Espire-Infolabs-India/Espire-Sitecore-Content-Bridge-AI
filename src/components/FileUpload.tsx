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
          
          console.log("Expires?", presignedUploadUrl.includes("Expires"));


          const tokenResponse = await fetch('/api/getToken');
          const tokenJson = await tokenResponse.json();
          const token = tokenJson.access_token;

          console.log("Token:", token);


          const formData = new FormData();
          formData.append('file', file); // actual File object
          formData.append('presignedUploadUrl', presignedUploadUrl);
          formData.append('fileData', base64 as string);          
          formData.append('token', token);
          
          const result = await fetch('/api/uploadFile', {
            method: 'POST',
            body: formData, // do NOT set Content-Type manually — browser sets it for multipart/form-data
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
    <div style={{ marginTop: '10px' }}>
      <input type="file" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="ml-2 px-3 py-1 bg-blue-600 text-white rounded"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};




/*
    // ✅ Get token from backend
    const tokenResponse = await fetch('/api/getToken');
    const tokenJson = await tokenResponse.json();
    const token = tokenJson.access_token;

    console.log("Token:", token);
 */

/*

          // Convert File to base64
          const fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (!reader.result) return reject("File read failed");
              resolve((reader.result as string).split(',')[1]); // remove prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          */


// Send to server
// const result = await fetch('/api/uploadFile', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({
//     fileName: file.name,
//     fileData,
//     presignedUploadUrl, // from GraphQL mutation
//     token
//   }),
// });


/*
// --- Step 2: Upload the file directly to S3 ---
const uploadResponse = await fetch(presignedUploadUrl, {
method: "PUT",
headers: {
"Content-Type": file.type || "application/octet-stream",
},
body: file,
});

if (!uploadResponse.ok) {
throw new Error(`Upload failed: ${uploadResponse.statusText}`);
}
*/



// Get presigned upload URL


/*
const formData = new FormData(); 
formData.append('cleanFileName', cleanFileName);
formData.append('token', token);

 


const result = await fetch('/api/uploadMedia', {
  method: 'POST',
  body: formData, // do NOT set Content-Type manually — browser sets it for multipart/form-data
});
console.log("Authoring Response:", result);
*/

/*
const input = {
        itemPath: `Default Website`,
        alt: cleanFileName,
        language: "en",
        overwriteExisting: true,
        includeExtensionInItemName: false,
        database: "master",
        versioned: false
      };

      console.log("GraphQL Input:", input);

      const mutation = `
        mutation UploadMedia($input: UploadMediaInput!) {
          uploadMedia(input: $input) {
            presignedUploadUrl
          }
        }
      `;
*/