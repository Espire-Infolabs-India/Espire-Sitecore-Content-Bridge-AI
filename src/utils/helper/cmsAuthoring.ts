// utils/helper/cmsAuthoring.ts
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { GET_RENDERING_DATASOURCE_FIELDS } from "../gqlQueries/getRenderingDatasourceFiled";
import { GET_RENDERING_INFO } from "../gqlQueries/getRenderingInfo";
import { GET_ITEM_ID_BY_PATH } from "../gqlQueries/getItemIdByPath";

/** ---- Types kept local to this helper ---- */
type MutateReturn<T> = {
  data?: { data?: T; errors?: Array<{ message?: string }> };
  errors?: Array<{ message?: string }>;
};

export interface RenderingInfo {
  itemId: string;
  name: string;
  path: string;
  datasourceTemplateValue: string | null; // path or {GUID}
  datasourceLocation: string | null;
}

export interface TemplateFieldMeta {
  value: string | number | readonly string[] | undefined;
  section: string;
  name: string;
  type: string;
  source?: string;
  shared?: boolean;
  unversioned?: boolean;
}

export interface CreateFieldInput {
  name: string;
  value: string;
}

export interface CreatedItem {
  itemId: string;
  name: string;
  displayName?: string;
  path: string;
  template?: { name?: string; fullName?: string };
}

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
    const msg = graphErrors.map((e) => e?.message || JSON.stringify(e)).join(" | ");
    throw new Error(`GraphQL error: ${msg}`);
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
  type FieldNode = { name?: string; fields?: { nodes?: NV[] } };
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
  val = val.split("|")[0].trim().replace(/^['"]|['"]$/g, "");

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
  const res = await callAuthoringGraphQL<G>(client, sitecoreContextId, MUTATION, {
    name: args.name,
    parentId: normalizeGuid(args.parentId),
    templateId: normalizeGuid(args.templateId),
  });

  const item = res?.createItem?.item;
  if (!item?.itemId) {
    throw new Error("CreateItem returned no item.");
  }
  return item;
}
