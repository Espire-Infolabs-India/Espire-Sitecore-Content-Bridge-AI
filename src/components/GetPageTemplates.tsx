"use client";
import { useEffect, useState } from "react";
import { Box, Button, Heading, Radio, RadioGroup, Stack, Text, Spinner, HStack, VStack, Card, CardBody } from "@chakra-ui/react";
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
  const [loading, setLoading] = useState<boolean>(false);

  const makeGraphQLQuery = async () => {
    const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;

    if (!sitecoreContextId) {
      console.error("❌ Sitecore Context ID not found.");
      return;
    }
    setLoading(true);
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
        setLoading(false);
      },
      onError: (error: any) => {
        console.error("❌ GraphQL query failed:", error);
        setLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Box p={4} maxW="3xl" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading as="h3" size="md">Landing Pages</Heading>
        <Button size="sm" variant="outline" onClick={makeGraphQLQuery}>Refresh</Button>
      </HStack>
      {loading ? (
        <HStack spacing={2}>
          <Spinner size="sm" />
          <Text>Loading templates...</Text>
        </HStack>
      ) : extractedData.length > 0 ? (
        <RadioGroup value={selectedName ?? ""}>
          <VStack align="stretch" spacing={3}>
            {extractedData.map((item) => (
              <Card key={item.itemID} size="sm" _hover={{ bg: "gray.50" }} cursor="pointer" onClick={() => handleRadioChange(item)}>
                <CardBody py={2}>
                  <HStack>
                    <Radio value={item.name} onChange={() => handleRadioChange(item)} />
                    <Text>{item.name}</Text>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </RadioGroup>
      ) : (
        <Text>No templates found.</Text>
      )}
    </Box>
  );
}