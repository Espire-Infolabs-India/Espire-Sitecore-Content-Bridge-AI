"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Spinner,
  HStack,
  VStack,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";
import { getTemplatesByPathQuery } from "../utils/gqlQueries/getTemplatesByPath";
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
  name?: string;
  standardValuesItem?: StandardValuesItem;
}

interface StandardValuesChild {
  name?: string;
  itemId?: string;
  path?: string;
  template?: Template;
}

interface Child {
  name?: string;
  displayName?: string;
  itemId?: string;
  path?: string;
  template?: Template;
  children?: {
    nodes?: Child[];
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
  prompt: string | "";
  brandWebsite: string | "";
}) {
  const ROOT_PATH = "/sitecore/templates/Project";
  const [extractedData, setExtractedData] = useState<ExtractedItem[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedTemplateData, setSelectedTemplateData] =
    useState<ExtractedItem | null>(null);
  const [generateContent, setGenerateContent] = useState<boolean | null>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>(ROOT_PATH);
  const [folders, setFolders] = useState<Child[]>([]);

  const getParentPath = (path: string): string | null => {
    if (!path || path === ROOT_PATH) return null;

    const trimmed = path.replace(/\/+$/, ""); // remove trailing slash if any
    const lastSlash = trimmed.lastIndexOf("/");

    if (lastSlash <= 0) return null;

    return trimmed.substring(0, lastSlash);
  };

  const makeGraphQLQuery = async (pathOverride?: string) => {
    const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;

    if (!sitecoreContextId) {
      console.error("❌ Sitecore Context ID not found.");
      return;
    }
    const path = pathOverride || currentPath;
    setLoading(true);
    await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: {
          sitecoreContextId,
        },
        body: {
          ...getTemplatesByPathQuery,
          variables: {
            path,
          },
        },
      },
      onSuccess: (data: any) => {
        const nodes: Child[] = data?.data?.data?.item?.children?.nodes ?? [];

        console.log("GRAPHQL children for path:", data?.data?.data?.item?.path);
        console.table(
          nodes.map((n) => ({
            name: n.name,
            path: n.path,
            templateName: n.template?.name,
          }))
        );

        const folderNodes: Child[] = [];
        const templateNodes: ExtractedItem[] = [];

        nodes.forEach((child) => {
          const name = child?.displayName || child?.name || "";
          const itemID = child?.itemId ?? "";
          const templateName = child?.template?.name ?? "";

          const finalRenderingsDirect =
            child?.template?.standardValuesItem?.field?.value ?? "";

          const stdChild =
            child?.children?.nodes?.find(
              (c) =>
                c?.name === "__Standard Values" ||
                c?.displayName === "__Standard Values"
            ) ?? null;

          const finalRenderingsIndirect =
            stdChild?.template?.standardValuesItem?.field?.value ?? "";

          const hasStdChild = !!stdChild;
          const hasFinalXml =
            !!finalRenderingsDirect || !!finalRenderingsIndirect;

          console.log("[SCR3][ClassifyNode]", {
            name,
            path: child?.path,
            templateName,
            hasStdChild,
            hasChildren: child?.children?.nodes?.length ?? 0,
            hasFinalXml,
            directXmlPreview: finalRenderingsDirect?.substring(0, 60),
            indirectXmlPreview: finalRenderingsIndirect?.substring(0, 60),
          });

          const isFolderLike =
            !hasFinalXml &&
            (templateName.toLowerCase().includes("folder") ||
              (child?.children?.nodes?.length ?? 0) > 0);

          if (isFolderLike) {
            folderNodes.push(child);
            return;
          }

          if (hasFinalXml) {
            templateNodes.push({
              name,
              itemID,
              finalRenderings:
                finalRenderingsDirect || finalRenderingsIndirect || "",
            });
          }
        });

        console.log(
          "[SCR3][GetPageTemplates][folders]",
          folderNodes.map((f) => ({ name: f.name, path: f.path }))
        );
        console.log(
          "[SCR3][GetPageTemplates][templates]",
          templateNodes.map((t) => ({ name: t.name, itemID: t.itemID }))
        );

        setFolders(folderNodes);
        setExtractedData(templateNodes);
        setCurrentPath(path);
        setLoading(false);
      },
      onError: (error: any) => {
        console.error("❌ GraphQL query failed:", error);
        setLoading(false);
      },
    });
  };

  const handleFolderClick = (folder: Child) => {
    if (!folder.path) return;
    makeGraphQLQuery(folder.path);
  };

  const handleBackClick = () => {
    const parent = getParentPath(currentPath);
    if (!parent) return;

    // clear selection when going up
    setSelectedName(null);
    setSelectedTemplateData(null);
    setGenerateContent(false);

    makeGraphQLQuery(parent);
  };

  const handleRadioChange = (item: ExtractedItem) => {
    setSelectedTemplateData(item);
    setSelectedName(item.name);
    setGenerateContent(true);
  };

  useEffect(() => {
    makeGraphQLQuery("/sitecore/templates/Project");
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
        <Heading as="h3" size="md">
          Landing Pages
        </Heading>

        <HStack spacing={3}>
          {currentPath !== ROOT_PATH && (
            <Button size="sm" variant="ghost" onClick={handleBackClick}>
              ← Back
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => makeGraphQLQuery()}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {loading ? (
        <HStack spacing={2}>
          <Spinner size="sm" />
          <Text>Loading templates...</Text>
        </HStack>
      ) : (
        <>
          {/* Show current Sitecore path for clarity */}
          <Text fontSize="xs" color="gray.500" mb={3}>
            {currentPath}
          </Text>

          {folders.length > 0 && (
            <VStack align="stretch" spacing={2} mb={4}>
              {folders.map((folder) => (
                <Card
                  key={folder.itemId}
                  size="sm"
                  _hover={{ bg: "gray.50" }}
                  cursor="pointer"
                  onClick={() => handleFolderClick(folder)}
                >
                  <CardBody py={2}>
                    <HStack>
                      <Text>📁 {folder.name}</Text>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}

          {extractedData.length > 0 ? (
            <RadioGroup value={selectedName ?? ""}>
              <VStack align="stretch" spacing={3}>
                {extractedData.map((item) => (
                  <Card
                    key={item.itemID}
                    size="sm"
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() => handleRadioChange(item)}
                  >
                    <CardBody py={2}>
                      <HStack>
                        <Radio
                          value={item.name}
                          onChange={() => handleRadioChange(item)}
                        />
                        <Text>{item.name}</Text>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </RadioGroup>
          ) : folders.length === 0 ? (
            <Text>No templates found.</Text>
          ) : null}
        </>
      )}
    </Box>
  );
}
