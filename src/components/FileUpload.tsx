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

  const handleUpload = async () => {
    if (!file || !client || !appContext) {
      setMessage('Select a file and ensure client/appContext are available.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      // ✅ Get Sitecore context ID from appContext
      const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;



      if (!sitecoreContextId) throw new Error("Sitecore context not found");


      console.log('Avinash Ji:', sitecoreContextId);

      // ✅ GraphQL mutation
const cleanFileName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")); // no extension, no bad chars

const input = {
  itemPath: `Market-Place/${cleanFileName}`,
  alt: cleanFileName,
  language: "en",
  overwriteExisting: true,
  includeExtensionInItemName: false,
  database: "master",
  versioned: false
};

const mutation = `
  mutation UploadMedia($input: UploadMediaInput!) {
    uploadMedia(input: $input) {
      presignedUploadUrl
    }
  }
`;

      

      // ✅ Call Sitecore GraphQL mutation
            // const result = await client?.mutate("xmc.authoring.graphql", {
            //   params: {
            //     query: mutation,
            //     variables: { sitecoreContextId },
            //   }
            // });


            await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId },
        body: {  query: mutation, variables: { input } },
      },
      onSuccess: async (data: any) => {
       


  const presignedUploadUrl = data?.data?.data?.uploadMedia?.presignedUploadUrl;


  // ✅ Upload file to presigned URL
  if (!presignedUploadUrl) {
    console.error("❌ No presigned upload URL returned");
    return;
  }

    console.log("Success:", data, presignedUploadUrl);

    const aaa=  await fetch(presignedUploadUrl, {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });


    console.log("Success11:", aaa);



        
      },
      onError: (error: any) => {
        console.error("❌ GraphQL query failed:", error);
      },
    });


           // console.log('Upload Result:', result);
      
      //       const presignedUrl = result?.data?.data?.uploadMedia?.presignedUploadUrl;
      //       const uploadedItemId = result?.data?.data?.uploadMedia?.item?.itemId;
      
      //       if (!presignedUrl) throw new Error("Failed to get presigned upload URL");

      // // ✅ Upload file to presigned URL
      // await fetch(presignedUrl, {
      //   method: 'PUT',
      //   body: file,
      //   headers: {
      //     'Content-Type': file.type
      //   }
      // });

      setMessage(`File uploaded successfully: ${file.name}`);
      //onUploadSuccess?.(uploadedItemId);

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
