"use client";
import { useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";

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
  children?: {
    nodes?: {
      template?: Template;
    }[];
  };
}

interface ExtractedItem {
  name: string;
  finalRenderings: string;
}

export default function GraphQLQuery({
  appContext,
  client,
}: {
  appContext: any;
  client: ClientSDK | null;
}) {
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);

  const makeGraphQLQuery = async () => {
    const sitecoreContextId = appContext.resourceAccess?.[0]?.context.preview;

    if (!sitecoreContextId) {
      console.error(
        "❌ Sitecore Context ID not found. Make sure your app is configured to use XM Cloud APIs."
      );
      return;
    }

    await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: {
          sitecoreContextId,
        },
        body: getPageTemplates,
      },
      onSuccess: (data) => {
        console.log("✅ GraphQL query successful:", data);

        const nodes: Child[] = data?.data?.data?.item?.children?.nodes ?? [];

        const extracted = nodes.map((child) => {
          const name = child?.name ?? "";
          const finalRenderings =
            child?.children?.nodes?.[0]?.template?.standardValuesItem?.field?.value ?? "";
          return { name, finalRenderings };
        });

        console.log("✅ Extracted Data:", extracted);

        setExtractedData(extracted); // ✅ Store in state
      },
      onError: (error) => {
        console.error("❌ GraphQL query failed:", error);
      },
    });
  };

  return (
    <div>
      <button onClick={makeGraphQLQuery}>Make GraphQL Query</button>

      {extractedData.length > 0 && (
        <div className="mt-4">
          <h3>Extracted Data:</h3>
          <ul>
            {extractedData.map((item, index) => (
              <li key={index}>
                <strong>{item.name}</strong>: {item.finalRenderings}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
