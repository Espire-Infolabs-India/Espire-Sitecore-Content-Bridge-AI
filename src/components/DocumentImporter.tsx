"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import GetPageTemplates from "./GetPageTemplates";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import Settings from "./Settings";
import upload from "../images/upload.png";
import { PutBlobResult } from "@vercel/blob";
import { Box, Flex, Text, Stack, Button, Input, Spinner } from "@chakra-ui/react";

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
  const [loading, setLoading] = useState(false);
  const [showPageTemplates, setShowPageTemplates] = useState(false);
  const [promptValue, setPromptValue] = useState<string>("Rewrite in a more engaging style, but maintain all important details.");
  const [brandWebsite, setBrandWebsite] = useState<string>("https://www.oki.com/global/profile/brand/");
  const [uploadedFileName, setUploadedFileName] = useState<string>("https://olrnhwkh9qc8dffa.public.blob.vercel-storage.com/Espire%20Blog%20AI%20Sample%20Content.pdf");
  //const [isModalOpen, setModalOpen] = useState(false);
 
  // --- Helpers ---
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
      
      setFile({ name: f.name, size: f.size, type: f.type, base64: "", original: f });
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
 
  // --- Render ---
  return (
    <>
      {!showPageTemplates && (
        <Box maxW="5xl" mx="auto" p={6}>
          <Settings
            prompt={promptValue}
            brandWebsite={brandWebsite}
            setPromptValue={getPromptValue}
            setBrandWebsite={getBrandWebsite}
          /><br />
 
          <Box borderWidth="1px" rounded="lg" bg="white" shadow="sm" overflow="hidden">
            <Box p={6}>
              {/* Drag & Drop Area */}
              <Box onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={onChooseClick}
                  position="relative"
                  rounded="md"
                  h="12rem"
                  display="flex"
                  flexDir="column"
                  alignItems="center"
                  justifyContent="center"
                  p={6}
                  cursor="pointer"
                  transition="background 0.2s ease"
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor="gray.300"
                  _hover={{ bg: !loading ? "gray.50" : undefined }}
                  opacity={loading ? 0.7 : 1}
                >
                  <Image src={upload} alt="upload image" width={30} height={30} />
                  <Text mt={2} color="gray.600">Drag & drop or</Text>
                  <Text mt={1} fontSize="sm" color="gray.700">
                    <Text as="span" color="blue.600" fontWeight="semibold">Choose File</Text> to upload
                  </Text>
                  <Text mt={1} fontSize="xs" color="gray.400" fontStyle="italic">
                    Supported formats: PDF, DOCX, DOC, TXT
                  </Text>
                  <Input ref={inputRef} type="file" accept=".pdf, .docx, .doc, .txt" onChange={onInputChange} display="none" />
                  {loading && (
                    <Box position="absolute" inset={0} bg="blackAlpha.200" display="flex" alignItems="center" justifyContent="center">
                      <Stack direction="row" spacing={2} align="center">
                        <Spinner size="sm" />
                        <Text fontSize="sm" color="gray.700">Loading file…</Text>
                      </Stack>
                    </Box>
                  )}
                </Box>
 
                {/* Selected File details */}
                <Flex mt={4} px={2} justify="space-between" align="center">
                  {file ? (
                    <Flex fontSize="sm" gap={4} align="center">
                      <Box>
                        <Text fontWeight="semibold">{file.name}</Text>
                        <Text color="gray.600">{Math.round(file.size / 1024)} KB</Text>
                      </Box>
                      <Button variant="ghost" colorScheme="red" onClick={reset}>Remove</Button>
                    </Flex>
                  ) : (
                    <Text fontSize="md" color="gray.500">No file selected</Text>
                  )}
 
                  {/* Footer Buttons */}
                  <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                    <Button onClick={reset} variant="outline" colorScheme="gray">Cancel</Button>
                    <Button onClick={handleImport} isDisabled={!file || loading} colorScheme="danger">Import</Button>
                  </Stack>
                </Flex>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}
 
 