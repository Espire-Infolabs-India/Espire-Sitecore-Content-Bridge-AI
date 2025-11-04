"use client";
import { useEffect, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";
import { parseRenderingsFromXml } from "../utils/lib/parseRenderingsFromXml";
import GenerateContent from "./GenerateContent";

interface Field {
  name?: string;
  value?: string;
}

interface StandardValuesItem {
  field?: Field;
}

interface Template {
  standardValuesItem?: StandardValuesItem;
}

interface Child {
  name?: string;
  itemId?: string;
  children?: {
    nodes?: {
      template?: Template;
    }[];
  };
}

interface ExtractedItem {
  name: string;
  itemID: string;
  finalRenderings: string;
}

export default function GetPageTemplates({
  appContext,
  client,
  selectedFile,
  prompt,
  brandWebsite,
}: {
  appContext: any;
  client: ClientSDK | null;
  selectedFile: any;
  prompt: string | '';
  brandWebsite: string | '';
}) {
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedTemplateData, setSelectedTemplateData] =
    useState<ExtractedItem | null>(null);
  const [generateContent, setGenerateContent] = useState<boolean | null>(false);

  const makeGraphQLQuery = async () => {
    const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;

    if (!sitecoreContextId) {
      console.error("❌ Sitecore Context ID not found.");
      return;
    }
    await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: {
          sitecoreContextId,
        },
        body: getPageTemplates,
      },
      onSuccess: (data: any) => {
        const nodes: Child[] = data?.data?.data?.item?.children?.nodes ?? [];
        const extracted: ExtractedItem[] = nodes.map((child) => {
          const name = child?.name ?? "";
          const itemID = child?.itemId ?? "";
          const finalRenderings =
            child?.children?.nodes?.[0]?.template?.standardValuesItem?.field
              ?.value ?? "";
          return { name, itemID, finalRenderings };
        });
        setExtractedData(extracted);
      },
      onError: (error: any) => {
        console.error("❌ GraphQL query failed:", error);
      },
    });
  };

  const handleRadioChange = (item: ExtractedItem) => {
    setSelectedTemplateData(item);
    setSelectedName(item.name);
    setGenerateContent(true);
  };

  useEffect(() => {
    makeGraphQLQuery();
  }, []);

  if (generateContent) {
    return (
      <GenerateContent
        appContext={appContext}
        client={client}
        selectedTemplateData={selectedTemplateData}
        selectedFile={selectedFile}
        prompt={prompt}
        brandWebsite={brandWebsite}
      />
    );
  }

  return (
    <div className="p-4">
      <button onClick={makeGraphQLQuery}> Make query </button>
      {extractedData.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Landing Pages ::</h3>
          <div className="space-y-3">
            {extractedData.map((item) => (
              <div
                key={item.itemID}
                className="flex items-center space-x-3 p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleRadioChange(item)}
              >
                <input
                  type="radio"
                  name="templateRadio"
                  value={item.name}
                  checked={selectedName === item.name}
                  onChange={() => handleRadioChange(item)}
                  className="cursor-pointer"
                />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>Loading templates...</p>
      )}
    </div>
  );
}
