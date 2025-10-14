"use client";
import { useEffect, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";
import { UploadedFile } from "./DocumentImporter";

interface ExtractedItem {
  name: string;
  itemID: string;
  finalRenderings: string;
}

interface GetPageTemplatesProps {
  appContext: any;
  client: ClientSDK | null;
  uploadedFile: UploadedFile | null;
}

export default function GetPageTemplates({
  appContext,
  client,
  uploadedFile,
}: GetPageTemplatesProps) {
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);
  const [selectedTemplateData, setSelectedTemplateData] =
    useState<ExtractedItem | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const makeGraphQLQuery = async () => {
    const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;
    if (!sitecoreContextId) return;

    await client?.mutate("xmc.authoring.graphql", {
      params: { query: { sitecoreContextId }, body: getPageTemplates },
      onSuccess: (data: any) => {
        const nodes = data?.data?.data?.item?.children?.nodes ?? [];
        const extracted = nodes.map((child: any) => ({
          name: child?.name ?? "",
          itemID: child?.itemId ?? "",
          finalRenderings:
            child?.children?.nodes?.[0]?.template?.standardValuesItem?.field
              ?.value ?? "",
        }));
        setExtractedData(extracted);
      },
      onError: (err: any) => console.error("GraphQL failed:", err),
    });
  };

  useEffect(() => {
    makeGraphQLQuery();
  }, []);

  const handleRadioChange = (item: ExtractedItem) => {
    setSelectedTemplateData(item);
    setSelectedName(item.name);
  };

  const handleGenerateClick = async () => {
    if (!selectedTemplateData) return alert("Select a template first.");
    if (!uploadedFile) return alert("No uploaded file.");

    try {
      setLoading(true);
      console.log("📤 Sending data to API...");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedTemplateData,
          pdfFile: uploadedFile, // 👈 send uploaded file (base64 + meta)
        }),
      });

      const data = await res.json();
      console.log("✅ API Response:", data);
    } catch (err) {
      console.error("❌ API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1>Screen 2</h1>

      {extractedData.length > 0 ? (
        <>
          <h3 className="text-lg font-semibold mb-2">Landing Pages:</h3>
          <div className="space-y-2 mb-4">
            {extractedData.map((item) => (
              <label
                key={item.itemID}
                className="flex items-center space-x-2 border p-2 rounded cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="template"
                  value={item.name}
                  checked={selectedName === item.name}
                  onChange={() => handleRadioChange(item)}
                />
                <span>{item.name}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button className="border px-4 py-2 rounded">Cancel</button>
            <button
              onClick={handleGenerateClick}
              disabled={loading || !selectedTemplateData}
              className={`bg-indigo-600 text-white px-4 py-2 rounded ${
                loading ? "opacity-50" : ""
              }`}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </>
      ) : (
        <p>Loading templates...</p>
      )}
    </div>
  );
}