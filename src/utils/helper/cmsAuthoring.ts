// utils/helper/cmsAuthoring.ts
import type {
  MutateReturn,
  RenderingInfo,
  TemplateFieldMeta,
  CreateFieldInput,
  CreatedItem,
  BasicItemInfo,
  DataRootInfo,
  GenerateContentSettingsParentsResult,
  HomeCandidatesResult,
  ItemPathByIdResult,
  ChildrenWithTemplateResult,
  FinalRenderingsQueryResult,
} from "./types";

import { GET_HOME_CANDIDATES } from "../gqlQueries/getHomeCandidates";
import { GET_ITEM_BY_ID } from "../gqlQueries/getItemById";
import { GET_ITEM_PATH_BY_ID } from "../gqlQueries/getItemPathById";
import { GET_CHILDREN_WITH_TEMPLATE } from "../gqlQueries/getChildrenWithTemplate";

import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { GET_RENDERING_DATASOURCE_FIELDS } from "../gqlQueries/getRenderingDatasourceFiled";
import { GET_RENDERING_INFO } from "../gqlQueries/getRenderingInfo";
import { GET_ITEM_ID_BY_PATH } from "../gqlQueries/getItemIdByPath";
import { WHICH_BASE_TEMPLATES_BY_ID } from "../gqlQueries/getBaseTemplatesByTemplateId";
import { GET_ITEM_FINAL_RENDERINGS } from "../gqlQueries/getItemFinalRenderings";

/** ---- Utils ---- */
export const normalizeGuid = (id: string): string => (id ?? "").toUpperCase();

export function whereById(itemIdWithBraces: string) {
  return { itemId: normalizeGuid(itemIdWithBraces), language: "en" as const };
}
export function whereByPathOrId(value: string) {
  const v = (value || "").trim();
  if (v.startsWith("/sitecore/")) return { path: v, language: "en" as const };
  if (v.startsWith("{") && v.endsWith("}"))
    return { itemId: normalizeGuid(v), language: "en" as const };
  return { path: v, language: "en" as const };
}

/** Core XMC Authoring GraphQL caller — body MUST be { query, variables }.
 *  Now with proper error surfacing.
 */
async function callAuthoringGraphQL<T>(
  client: ClientSDK,
  sitecoreContextId: string,
  query: string,
  variables?: object
): Promise<T> {
  const payload = { query, variables: variables ?? {} };

  const res = (await client.mutate("xmc.authoring.graphql", {
    params: { query: { sitecoreContextId }, body: payload },
  })) as MutateReturn<T>;

  const graphErrors = res?.data?.errors ?? res?.errors;
  if (Array.isArray(graphErrors) && graphErrors.length) {
    const msg = graphErrors
      .map((e) => e?.message || JSON.stringify(e))
      .join(" | ");
    throw new Error(`GraphQL error: ${msg}`);
  }

  const data = res?.data?.data;
  if (!data) throw new Error("Empty GraphQL response (no data).");
  return data as T;
}

async function callAuthoringGraphQLAllowPartial<T>(
  client: ClientSDK,
  sitecoreContextId: string,
  query: string,
  variables?: object
): Promise<T> {
  const payload = { query, variables: variables ?? {} };

  const res = (await client.mutate("xmc.authoring.graphql", {
    params: { query: { sitecoreContextId }, body: payload },
  })) as MutateReturn<T>;

  const graphErrors = res?.data?.errors ?? res?.errors;

  // Do NOT throw. Log and continue because data can still be present.
  if (Array.isArray(graphErrors) && graphErrors.length) {
    const msg = graphErrors
      .map((e) => e?.message || JSON.stringify(e))
      .join(" | ");
    console.warn(
      "[callAuthoringGraphQLAllowPartial][WARN] GraphQL errors:",
      msg
    );
  }

  const data = res?.data?.data;
  if (!data) throw new Error("Empty GraphQL response (no data).");
  return data as T;
}

/** Resolve a Rendering GUID → name + DS Template/Location */
export async function resolveRendering(
  client: ClientSDK,
  sitecoreContextId: string,
  renderingIdWithBraces: string
): Promise<RenderingInfo> {
  type G = {
    item?: {
      itemId?: string;
      name?: string;
      path?: string;
      datasourceTemplate?: { value?: string };
      datasourceLocation?: { value?: string };
    };
  };

  const gql = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    GET_RENDERING_INFO,
    { where: whereById(renderingIdWithBraces) }
  );

  const it = gql?.item;
  const idNorm = normalizeGuid(renderingIdWithBraces);

  return {
    itemId: normalizeGuid(it?.itemId || idNorm),
    name: it?.name || idNorm,
    path: it?.path || "",
    datasourceTemplateValue: it?.datasourceTemplate?.value ?? null,
    datasourceLocation: it?.datasourceLocation?.value ?? null,
  };
}

/** Fetch all fields (with meta) for a Template (path or {GUID}) */
export async function getTemplateFields(
  client: ClientSDK,
  sitecoreContextId: string,
  templatePathOrId: string
): Promise<TemplateFieldMeta[]> {
  type NV = { name?: string; value?: string };
  type FieldNode = {
    name?: string;
    value?: string;
    fields?: { nodes?: NV[] };
    shortdescription?: { value?: string };
    longdescription?: { value?: string };
  };
  type SectionNode = { name?: string; children?: { nodes?: FieldNode[] } };
  type G = { item?: { children?: { nodes?: SectionNode[] } } };

  const gql = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    GET_RENDERING_DATASOURCE_FIELDS,
    { where: whereByPathOrId(templatePathOrId) }
  );

  const sections: SectionNode[] = gql?.item?.children?.nodes ?? [];
  const out: TemplateFieldMeta[] = [];

  for (const sec of sections) {
    const secName = sec?.name ?? "";
    theLoop: {
      const fieldNodes: FieldNode[] = sec?.children?.nodes ?? [];
      for (const f of fieldNodes) {
        const metaNodes: NV[] = f?.fields?.nodes ?? [];
        const meta: Record<string, string> = {};
        for (const n of metaNodes) {
          const k = (n?.name ?? "").toLowerCase();
          if (k) meta[k] = n?.value ?? "";
        }
        out.push({
          section: secName,
          name: f?.name ?? "",
          type: meta["type"] || "",
          source: meta["source"],
          shared: (meta["shared"] || "").toLowerCase() === "1",
          unversioned: (meta["unversioned"] || "").toLowerCase() === "1",
          shortDescription: f?.shortdescription?.value || "",
          longDescription: f?.longdescription?.value || "",
          value: f?.value ?? "",
        });
      }
    }
  }
  return out;
}

/** Resolve a template ID from a path or GUID string (defensive: strip quotes and anything after | ) */
export async function resolveTemplateId(
  client: ClientSDK,
  sitecoreContextId: string,
  templatePathOrId: string
): Promise<string> {
  let val = (templatePathOrId ?? "").trim();
  if (!val) throw new Error("Datasource Template is empty.");

  // drop any |query: or other decorations; strip quotes
  val = val
    .split("|")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (val.startsWith("{") && val.endsWith("}")) {
    return normalizeGuid(val);
  }

  type G = { item?: { itemId?: string } };
  const data = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    GET_ITEM_ID_BY_PATH,
    { path: val }
  );
  const id = data?.item?.itemId;
  if (!id) throw new Error(`Could not resolve templateId from path: ${val}`);
  return normalizeGuid(id);
}

/** Escape for a GraphQL string literal */
function gqStr(s: string): string {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/** Build mutation that inlines the fields literal (avoids value-type mismatch) */
function buildCreateItemMutationWithInlineFields(inlineFields: string): string {
  return `
mutation CreateItemFromTemplate($name: String!, $parentId: ID!, $templateId: ID!) {
  createItem(input: {
    name: $name
    parent: $parentId
    templateId: $templateId
    fields: [${inlineFields}]
  }) {
    item {
      itemId
      name
      displayName
      path
      template { name fullName }
    }
  }
}`.trim();
}

/** Create item (fields are inlined) */
export async function createItemFromTemplate(
  client: ClientSDK,
  sitecoreContextId: string,
  args: {
    name: string;
    parentId: string;
    templateId: string;
    fields: CreateFieldInput[];
  }
): Promise<CreatedItem> {
  const inlineFields = args.fields
    .map(
      (f) =>
        `{ name: "${gqStr(f.name)}", value: "${gqStr(String(f.value ?? ""))}" }`
    )
    .join(", ");

  const MUTATION = buildCreateItemMutationWithInlineFields(inlineFields);

  type G = { createItem?: { item?: CreatedItem } };
  const res = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    MUTATION,
    {
      name: args.name,
      parentId: normalizeGuid(args.parentId),
      templateId: normalizeGuid(args.templateId),
    }
  );

  const item = res?.createItem?.item;
  if (!item?.itemId) {
    throw new Error("CreateItem returned no item.");
  }
  return item;
}

/* ----------------------- Base Templates helper ----------------------- */

type BaseTemplateNode = {
  name: string;
  fullName: string;
  templateId: string;
};

function toDashedGuid(id: string): string {
  if (!id) return id;
  const s = id.replace(/[{}-]/g, "").toUpperCase();
  if (s.length !== 32) return id;
  return `${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20, 32)}`;
}

type WhichBaseTemplatesByIdResult = {
  itemTemplate: {
    name: string;
    fullName: string;
    templateId: string;
    baseTemplates: { edges: Array<{ node: BaseTemplateNode }> };
  } | null;
};

export async function getBaseTemplatesByTemplateId(
  client: ClientSDK,
  sitecoreContextId: string,
  templateIdRaw: string
): Promise<BaseTemplateNode[]> {
  let tid = (templateIdRaw || "").trim();
  if (!tid) throw new Error("templateId is empty.");
  const dashed = toDashedGuid(tid.replace(/[{}]/g, ""));
  const templateId = dashed;

  console.log(">> [SCR3][GraphQL][WhichBaseTemplatesById vars]:", {
    templateId,
  });

  const data = await callAuthoringGraphQL<WhichBaseTemplatesByIdResult>(
    client,
    sitecoreContextId,
    WHICH_BASE_TEMPLATES_BY_ID,
    { templateId }
  );

  const nodes =
    data?.itemTemplate?.baseTemplates?.edges?.map((e) => e.node) ?? [];

  console.log("[SCR3][GraphQL][WhichBaseTemplatesById][ok]", {
    templateId,
    baseCount: nodes.length,
  });

  return nodes;
}

/* ----------------------- getItemIdByPath helper ---------------------- */

export async function getItemByPath(
  client: ClientSDK,
  sitecoreContextId: string,
  pathOrId: string
): Promise<BasicItemInfo | null> {
  type G = { item?: BasicItemInfo | null };
  console.log("[SCR3][GQL][getItemByPath][vars]", { path: pathOrId });

  const data = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    GET_ITEM_ID_BY_PATH,
    { path: pathOrId }
  );

  return data?.item ?? null;
}

/* ------- RAW template definition by PATH (full children/fields tree) ------- */

export type RawTemplateFieldNode = {
  itemId: string;
  name: string;
  fields?: { nodes?: Array<{ name?: string; value?: string }> };
};
export type RawTemplateSectionNode = {
  name?: string;
  children?: { nodes?: RawTemplateFieldNode[] };
};
export type RawTemplateDefinition = {
  item?: {
    itemId?: string;
    name?: string;
    path?: string;
    children?: { nodes?: RawTemplateSectionNode[] };
  } | null;
};

export async function getTemplateDefinitionByPath(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
  language = "en"
): Promise<RawTemplateDefinition["item"]> {
  const variables = { where: { path, language } };

  console.log("[SCR3][GraphQL][TemplateDefinition][vars]", variables);

  const data = await callAuthoringGraphQL<RawTemplateDefinition>(
    client,
    sitecoreContextId,
    GET_RENDERING_DATASOURCE_FIELDS,
    variables
  );

  console.log("[SCR3][GraphQL][TemplateDefinition][ok]", data?.item);
  return data?.item ?? null;
}

/* ------------------- __Final Renderings (XML) helper ------------------- */

/**
 * Fetch the "__Final Renderings" XML for a given itemId.
 * Returns the XML string ("" if missing) and logs it.
 */
export async function fetchFinalRenderingsXML(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string
): Promise<string> {
  const id = normalizeGuid(itemId);
  const query = GET_ITEM_FINAL_RENDERINGS(id);

  const data = await callAuthoringGraphQL<FinalRenderingsQueryResult>(
    client,
    sitecoreContextId,
    query
  );

  const xml = data?.item?.field?.value ?? "";
  console.log("[BlogItemFinalRenderingsXML]", xml);
  return xml;
}

import { UPDATE_FINAL_RENDERINGS } from "../gqlQueries/updateFinalRenderings";

/**
 * Update __Final Renderings XML for a given item
 */
export async function updateFinalRenderingsXML(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  xml: string
): Promise<void> {
  const variables = {
    itemId,
    xml,
  };

  console.log("[UpdateFinalRenderingsXML][vars]", variables);

  const payload = {
    query: UPDATE_FINAL_RENDERINGS,
    variables,
  };

  const res = await client.mutate("xmc.authoring.graphql", {
    params: { query: { sitecoreContextId }, body: payload },
  });

  console.log("[UpdateFinalRenderingsXML][result]", res);
}

// ------------------- Resolve Home Page Id (no hardcoding) -------------------

const HEX32 = /^[0-9A-F]{32}$/i;

function toBracedDashedGuid(raw: string): string | null {
  console.log("[toBracedDashedGuid] raw =", raw);
  if (!raw) return null;

  const hex = raw.replace(/[{}-]/g, "").toUpperCase();
  console.log(
    "[toBracedDashedGuid] hex =",
    hex,
    "len=",
    hex.length,
    "match=",
    HEX32.test(hex)
  );
  if (!HEX32.test(hex)) return null;

  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
}

export async function resolveHomePageId(
  client: ClientSDK,
  sitecoreContextId: string
): Promise<string | null> {
  const rootPath = "/sitecore/content";

  try {
    const where = whereByPathOrId(rootPath);

    const data = await callAuthoringGraphQL<HomeCandidatesResult>(
      client,
      sitecoreContextId,
      GET_HOME_CANDIDATES,
      { where }
    );

    const tenants = data?.item?.children?.nodes ?? [];

    const candidates: Array<{
      tenantName: string;
      siteName: string;
      homeName: string;
      homePath: string;
      homeId: string;
    }> = [];

    for (const tenant of tenants) {
      const tenantName = tenant?.name ?? "(unknown-tenant)";
      const sites = tenant?.children?.nodes ?? [];

      for (const site of sites) {
        const siteName = site?.name ?? "(unknown-site)";
        const children = site?.children?.nodes ?? [];

        const home = children.find(
          (c) => (c?.name ?? "").toLowerCase() === "home"
        );

        if (home?.itemId) {
          candidates.push({
            tenantName,
            siteName,
            homeName: home?.name ?? "Home",
            homePath: home?.path ?? "",
            homeId:
              toBracedDashedGuid(home.itemId) ?? normalizeGuid(home.itemId),
          });
        }
      }
    }

    console.log("[resolveHomePageId][DEBUG] Home candidates:", candidates);

    if (candidates.length === 0) {
      console.warn(
        "[resolveHomePageId][WARN] No Home found under /sitecore/content/{tenant}/{site}/Home"
      );
      return null;
    }

    if (candidates.length > 1) {
      console.warn(
        "[resolveHomePageId][WARN] Multiple Home candidates found. Returning the first one for now:",
        candidates
      );
    }

    const chosen = candidates[0];
    console.log("[resolveHomePageId][OK] Using Home:", chosen);

    return chosen.homeId;
  } catch (err: any) {
    console.error("[resolveHomePageId][ERROR]", err?.message || err);
    return null;
  }
}

// ------------------- Resolve Rendering Data Source Location (Marketplace-safe, no hardcoding) -------------------

export async function getItemById(
  client: ClientSDK,
  sitecoreContextId: string,
  itemIdWithBracesOrRaw: string
): Promise<BasicItemInfo | null> {
  type G = { item?: BasicItemInfo | null };

  const where = whereById(
    itemIdWithBracesOrRaw.startsWith("{")
      ? itemIdWithBracesOrRaw
      : `{${itemIdWithBracesOrRaw.replace(/[{}]/g, "")}}`
  );

  const data = await callAuthoringGraphQL<G>(
    client,
    sitecoreContextId,
    GET_ITEM_BY_ID,
    { where }
  );

  return data?.item ?? null;
}

export async function resolveDataFolderIdFromHome(
  client: ClientSDK,
  sitecoreContextId: string,
  homePageId: string
): Promise<DataRootInfo | null> {
  try {
    if (!homePageId) return null;

    // 1) get Home path by ID
    const data = await callAuthoringGraphQL<ItemPathByIdResult>(
      client,
      sitecoreContextId,
      GET_ITEM_PATH_BY_ID,
      { where: whereById(homePageId) }
    );

    const homePath = data?.item?.path || "";
    if (!homePath) {
      console.warn(
        "[resolveDataFolderIdFromHome][WARN] Home path not found for:",
        homePageId
      );
      return null;
    }

    // 2) derive site root path by stripping trailing "/Home"
    const siteRootPath = homePath.replace(/\/Home$/i, "");
    if (!siteRootPath || siteRootPath === homePath) {
      console.warn(
        "[resolveDataFolderIdFromHome][WARN] Could not derive site root from Home path:",
        homePath
      );
      return null;
    }

    // 3) Data folder path
    const dataRootPath = `${siteRootPath}/Data`;

    // 4) Resolve Data folder item
    const dataItem = await getItemByPath(
      client,
      sitecoreContextId,
      dataRootPath
    );
    if (!dataItem?.itemId) {
      console.warn(
        "[resolveDataFolderIdFromHome][WARN] Data folder not found at:",
        dataRootPath
      );
      return null;
    }

    const info: DataRootInfo = {
      dataRootId: normalizeGuid(dataItem.itemId),
      dataRootPath,
    };

    console.log("[resolveDataFolderIdFromHome][OK]", info);
    return info;
  } catch (err: any) {
    console.error("[resolveDataFolderIdFromHome][ERROR]", err?.message || err);
    return null;
  }
}

export async function getChildrenWithTemplate(
  client: ClientSDK,
  sitecoreContextId: string,
  parentItemIdWithOrWithoutBraces: string
): Promise<
  Array<{ itemId: string; name: string; path: string; templateName: string }>
> {
  const where = whereById(toBracedGuid(parentItemIdWithOrWithoutBraces));

  const data =
    await callAuthoringGraphQLAllowPartial<ChildrenWithTemplateResult>(
      client,
      sitecoreContextId,
      GET_CHILDREN_WITH_TEMPLATE,
      { where }
    );

  const nodes = data?.item?.children?.nodes ?? [];

  const out = nodes
    .filter((n) => !!n && !!n.itemId) //  skip null nodes
    .map((n) => ({
      itemId: normalizeGuid(n!.itemId!),
      name: n?.name ?? "",
      path: n?.path ?? "",
      templateName: n?.template?.name ?? "",
    }));

  console.log("[getChildrenWithTemplate][OK]", {
    parentItemId: parentItemIdWithOrWithoutBraces,
    count: out.length,
  });

  return out;
}

// helper: ensure {GUID} form (needed because whereById expects braces)
function toBracedGuid(raw: string): string {
  const hex = (raw || "").toUpperCase().replace(/[{}-]/g, "");
  if (hex.length !== 32) return normalizeGuid(raw);
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
}

export async function resolveSiteDataRoot(
  client: ClientSDK,
  sitecoreContextId: string
): Promise<{ dataRootId: string; dataRootPath: string } | null> {
  const rootPath = "/sitecore/content";

  try {
    const where = whereByPathOrId(rootPath);

    const data = await callAuthoringGraphQL<HomeCandidatesResult>(
      client,
      sitecoreContextId,
      GET_HOME_CANDIDATES,
      { where }
    );

    const tenants = data?.item?.children?.nodes ?? [];

    const candidates: Array<{
      tenantName: string;
      siteName: string;
      homeId: string;
      dataPath: string;
    }> = [];

    for (const tenant of tenants) {
      const tenantName = tenant?.name ?? "";
      const sites = tenant?.children?.nodes ?? [];

      for (const site of sites) {
        const siteName = site?.name ?? "";
        const children = site?.children?.nodes ?? [];

        const home = children.find(
          (c) => (c?.name ?? "").toLowerCase() === "home"
        );

        if (tenantName && siteName && home?.itemId) {
          candidates.push({
            tenantName,
            siteName,
            homeId: normalizeGuid(home.itemId),
            dataPath: `/sitecore/content/${tenantName}/${siteName}/Data`,
          });
        }
      }
    }

    console.log("[resolveSiteDataRoot][DEBUG] Candidates:", candidates);

    if (candidates.length === 0) {
      console.warn(
        "[resolveSiteDataRoot][WARN] No Home found under /sitecore/content/{tenant}/{site}/Home, so cannot infer /Data."
      );
      return null;
    }

    if (candidates.length > 1) {
      console.warn(
        "[resolveSiteDataRoot][WARN] Multiple sites detected. Using the first candidate for now:",
        candidates[0]
      );
    }

    const chosen = candidates[0];

    // Resolve /Data itemId
    const dataItem = await getItemByPath(
      client,
      sitecoreContextId,
      chosen.dataPath
    );

    if (!dataItem?.itemId) {
      console.warn(
        "[resolveSiteDataRoot][WARN] Data folder not found at:",
        chosen.dataPath
      );
      return null;
    }

    const result = {
      dataRootId: normalizeGuid(dataItem.itemId),
      dataRootPath: dataItem.path,
    };

    console.log("[resolveSiteDataRoot][OK]", result);
    return result;
  } catch (err: any) {
    console.error("[resolveSiteDataRoot][ERROR]", err?.message || err);
    return null;
  }
}
