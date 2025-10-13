"use client";
import { useEffect, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";
import { parseRenderingsFromXml } from "../utils/lib/parseRenderingsFromXml";

// Types
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

export default function GenerateContent({
  appContext,
  client,
  selectedTemplateData,
}: {
  appContext: any;
  client: ClientSDK | null;
  selectedTemplateData: ExtractedItem | null;
}) {
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);

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

  useEffect(() => {
    makeGraphQLQuery();
  }, []);

  return (
    <div className="p-4">
      <h1> Screen 3</h1>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Generate Content ::</h3>
        <div className="space-y-3">
          {selectedTemplateData ? (
            <div className="p-4 border rounded bg-gray-50">
              <h4 className="text-md font-medium mb-2">
                Selected Template: {selectedTemplateData.name}
              </h4>
              <h4>Page Item ID: {selectedTemplateData.itemID}</h4>
              {selectedTemplateData.finalRenderings ? (
                <div>
                  <h5 className="font-semibold mb-1">Parsed Renderings:</h5>
                  <pre className="bg-white p-2 border rounded overflow-x-auto">
                    {JSON.stringify(
                      parseRenderingsFromXml(
                        selectedTemplateData.finalRenderings
                      ),
                      null,
                      2
                    )}
                  </pre>
                </div>
              ) : (
                <p className="text-yellow-600">
                  ⚠️ No finalRenderings found for {selectedTemplateData.name}
                </p>
              )}
            </div>
          ) : (
            <p>Please select a template to see details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
