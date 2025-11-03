"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import GetMediaItems from "./GetMediaItems";
import { PutBlobResult } from "@vercel/blob";

import {
  getTemplateFields,
  resolveRendering,
  normalizeGuid,
  resolveTemplateId,
  createItemFromTemplate,
  getBaseTemplatesByTemplateId,
  getItemByPath,
  getTemplateDefinitionByPath,
  fetchFinalRenderingsXML,
  updateFinalRenderingsXML,
} from "../utils/helper/cmsAuthoring";
import type {
  TemplateFieldMeta,
  RenderingInfo,
} from "../utils/helper/cmsAuthoring";
import {
  parseRenderingsFromXml,
  RenderingFromXml,
} from "../utils/lib/parseRenderingsFromXml";


interface ExtractedItem {
  name: string;
  itemID: string;
  finalRenderings: string;
}
type FormValues = Record<string, string | boolean>;

function Chip({
  label,
  active,
  title,
  onClick,
}: {
  label: string;
  active?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full border text-sm transition",
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-900 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="mb-3">
        <div className="text-base font-semibold">{title}</div>
        {subtitle ? (
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function GenerateContent({
  appContext,
  client,
  selectedTemplateData,
  selectedFile,
  prompt,
  brandWebsite,
}: {
  appContext: { resourceAccess?: Array<{ context?: { preview?: string } }> };
  client: ClientSDK | null;
  selectedTemplateData: ExtractedItem | null;
  selectedFile: any;
  prompt: string | "";
  brandWebsite: string | "";
}) {
  const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview ?? "";

  const [renderings, setRenderings] = useState<RenderingFromXml[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, RenderingInfo>>({});
  const [namesReady, setNamesReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState("");

  const [activeRenderingId, setActiveRenderingId] = useState<string>("");
  const [fields, setFields] = useState<TemplateFieldMeta[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({}); // Rendering form values
  const [dsTemplate, setDsTemplate] = useState<string>("");
  //const [templateDetails, setTemplateDetails = useState<any>();
  const [dsLocation, setDsLocation] = useState<string>(""); 

  // Base template values
  const [baseFormValues, setBaseFormValues] = useState<FormValues>({}); // Base Page + _SEO values
  const [isBaseFormLoader, setIsBaseFormLoader] = useState<boolean>(false);

  // Hard-coded parent (datasource creation)
  const PARENT_ID = "{19175065-C269-4A6D-A2BA-161E7957C2F8}";
  const [newItemName, setNewItemName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [created, setCreated] = useState<null | {
    itemId: string;
    name: string;
    path: string;
  }>(null);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);

  // Base templates
  const [baseTemplates, setBaseTemplates] = useState<
    Array<{ name: string; fullName: string; templateId: string }>
  >([]);

  // getItemIdByPath result
  const [pageBaseTemplateItem, setPageBaseTemplateItem] = useState<{
    itemId: string;
    name: string;
    displayName?: string;
    path: string;
  } | null>(null);

  // RAW template definition
  const [pageTemplateDefinition, setPageTemplateDefinition] =
    useState<any>(null);

  // FINAL: extracted field/type pairs from Page + _Seo Metadata (deduped by fieldName)

  const [pageFieldTypePairs, setPageFieldTypePairs] = useState<
    { fieldName: string; fieldType: string, value: any }[]
  >([]);

  // ===================== Blog Page creation constants & state =====================
  const BLOG_PARENT_ID = "{CFA8F31E-2335-47DF-8041-B8B8261D6A6A}";
  const BLOG_TEMPLATE_ID = "43C1BC5D-831F-47F8-9D03-D3BA6602A0FD";

  const [newPageName, setNewPageName] = useState<string>("");
  const [creatingPage, setCreatingPage] = useState(false);
  const [pageError, setPageError] = useState<string>("");
  const [pageCreated, setPageCreated] = useState<null | {
    itemId: string;
    name: string;
    path: string;
  }>(null);

  // Hold the __Final Renderings XML for the newly created Blog item
  const [blogFinalRenderingsXML, setBlogFinalRenderingsXML] =
    useState<string>("");
  const [blogFinalRenderingsXMLUpdated, setBlogFinalRenderingsXMLUpdated] =
    useState<string>("");

  function pairsToMetas(
    pairs: { fieldName: string; fieldType: string }[]
  ): any {
    return pairs.map((p) => ({
      section: "BaseTemplate",
      name: p.fieldName,
      type: p.fieldType,
    }));
  }

  // ===================== original logic (renderings resolve) =====================
    // Parse XML & resolve ALL names for left renderings list
    useEffect(() => {
      //setTemplateDetails(selectedTemplateData);
      setRenderings([]);
      setNameMap({});
      setActiveRenderingId("");
      setFields([]);
      setFormValues({});
      setDsTemplate("");
      setDsLocation("");
      setNamesReady(false);

      if (
        !client ||
        !sitecoreContextId ||
        !selectedTemplateData?.finalRenderings
      ) {
        setNamesReady(true);
        return;
      }

      const list = parseRenderingsFromXml(selectedTemplateData.finalRenderings);
      setRenderings(list);

      if (list.length === 0) {
        setNamesReady(true);
        return;
      }

      const guids = Array.from(
        new Set(list.map((r) => normalizeGuid(r.componentId)))
      );

      (async () => {
        const results = await Promise.allSettled(
          guids.map((g) => resolveRendering(client, sitecoreContextId, g))
        );

        const map: Record<string, RenderingInfo> = {};
        for (let i = 0; i < results.length; i++) {
          const res = results[i];
          if (res.status === "fulfilled") {
            const info = res.value;
            const xmlGuid = guids[i];
            map[normalizeGuid(info.itemId)] = info;
            map[xmlGuid] = info;
          }
        }
        setNameMap(map);
        setNamesReady(true);
      })();
  }, [client, sitecoreContextId, selectedTemplateData?.finalRenderings]);

  // helper: extract [{fieldName, fieldType}] from raw template tree
  function extractFieldTypePairs(
    raw: any
  ): { fieldName: string; fieldType: string, value: string }[] {
    const pairs: { fieldName: string; fieldType: string, value:string }[] = [];
    try {
      const sectionNodes = raw?.children?.nodes ?? [];
      for (const section of sectionNodes) {
        const fieldNodes = section?.children?.nodes ?? [];
        for (const f of fieldNodes) {
          const fieldName = f?.name ?? "";
          const typeNode = f?.fields?.nodes?.find(
            (n: any) => n?.name === "Type"
          );
          const fieldType = typeNode?.value ?? "";
          let value = "";
          if (fieldName && fieldType) {
            pairs.push({ fieldName, fieldType, value });
          }
        }
      }
    } catch (e) {
      console.error("[SCR3][GraphQL][TemplateDefinition][Extract][ERROR]", e);
    }
    return pairs;
  }

  // --- Chain calls: Base Templates -> Page -> _Seo Metadata -> merge & dedupe
  useEffect(() => {
    if (!client || !sitecoreContextId) return;

    const BLOG_TEMPLATE_ID = "43C1BC5D-831F-47F8-9D03-D3BA6602A0FD";

    (async () => {
      try {
        setPageFieldTypePairs([]);
        var pagePairs;

        const nodes = await getBaseTemplatesByTemplateId(
          client!,
          sitecoreContextId,
          BLOG_TEMPLATE_ID
        );
        setBaseTemplates(nodes);

        // 1) PAGE
        const pageBase = nodes.find(
          (n) => (n.name || "").toLowerCase() === "page"
        );
        if (pageBase) {
          const pageItem = await getItemByPath(
            client!,
            sitecoreContextId,
            pageBase.templateId
          );
          setPageBaseTemplateItem(pageItem);

          if (pageItem?.path) {
            const pageRaw = await getTemplateDefinitionByPath(
              client!,
              sitecoreContextId,
              pageItem.path,
              "en"
            );
            setPageTemplateDefinition(pageRaw);
            pagePairs = extractFieldTypePairs(pageRaw);
            //setPageFieldTypePairs(pagePairs);
          }
        } else {
          //console.log("[SCR3] Base template 'Page' not found.");
        }

        // 2) _SEO METADATA
        const seoBase = nodes.find(
          (n) => (n.name || "").toLowerCase() === "_seo metadata"
        );
        if (seoBase) {
          const seoItem = await getItemByPath(
            client!,
            sitecoreContextId,
            seoBase.templateId
          );
          if (seoItem?.path) {
            const seoRaw = await getTemplateDefinitionByPath(
              client!,
              sitecoreContextId,
              seoItem.path,
              "en"
            );
            const seoPairs = extractFieldTypePairs(seoRaw);

            // Merge & de-duplicate by fieldName
            const all = [...pagePairs as [], ...seoPairs];
            let uniquePairs = all.reduce((acc, f) => {
              if (!acc.some((x:any) => x.fieldName === f.fieldName)) acc.push(f);
              return acc;
            }, [] as { fieldName: string; fieldType: string }[]);

            let uniquePairsNew = uniquePairs.map((item:any) => {
              return {
                name: item.fieldName,
                type: item.fieldType,
                section: "BaseTemplate",
                value: "",
              };
            });

            uniquePairsNew.push({
              name: 'pageName',
              type: 'Single-Line Text',
              section: "BaseTemplate",
              value: "",
            })
            
            console.log("uniquePairsNew..........", uniquePairsNew, selectedFile);

            setIsBaseFormLoader(true);
            setIsPageLoading(true);
            // render these fields to generate content from ai
            let data;
            try {
              const thirdPartyRes = await fetch("/api/chat-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedFile, tFields:uniquePairsNew as any, prompt, brandWebsite }),
              });
              if (!thirdPartyRes.ok) throw new Error("Third-party API call failed");
              data = await thirdPartyRes.json();
            } finally {
              setIsPageLoading(false);
            }
            let TempFinalResponse = data?.data?.result;
            // uncommented this code later for set page name
            let pageNameResponse = TempFinalResponse?.filter((item: any) => item.name == 'pageName');
            setNewPageName(pageNameResponse[0]?.value);
            
            let finalResponse = uniquePairs.reduce((acc: any[], item: any) => {
              const match = TempFinalResponse.find((obj: any) =>
                obj.name == item?.fieldName
              );

              if (match) {
                acc.push({ ...item, ...match });
              }
            
              // if no match, just continue
              return acc;
            }, []);

            setPageFieldTypePairs(finalResponse);
            // initialize base form values so BaseTemplate inputs show and control values
            const initialBaseValues: Record<string, string | boolean> = finalResponse.reduce(
              (acc: Record<string, string | boolean>, it: any) => {
                if (it?.fieldName) acc[it.fieldName] = String(it.value ?? "");
                return acc;
              },
              {}
            );
            // if (pageNameResponse?.[0]?.value) {
            //   initialBaseValues["pageName"] = String(pageNameResponse[0].value);
            // }
            setBaseFormValues(initialBaseValues);
            setIsBaseFormLoader(false);
          }
        } else {
          //console.log("[SCR3] Base template '_Seo Metadata' not found.");
        }
      } catch (err: any) {
        console.error(
          "=== [SCR3][GraphQL][BaseTemplatesChain][ERROR] ===",
          err?.message || err
        );
      }
    })();
  }, [client, sitecoreContextId]);

  // Click → load template fields from datasource template (right panel)
  const onClickRendering = async (componentIdRaw: string, compName: any) => {
    if (!client || !sitecoreContextId) return;
    const componentId = normalizeGuid(componentIdRaw);

    setIsPageLoading(true);
    setActiveRenderingId(componentId);
    setFields([]);
    setFormValues({});
    setCreated(null);
    setSaveError("");

    let info = nameMap[componentId];
    if (!info) {
      info = await resolveRendering(client, sitecoreContextId, componentId);
      setNameMap((s) => ({
        ...s,
        [normalizeGuid(info.itemId)]: info,
        [componentId]: info,
      }));
    }

    const templateRaw = info.datasourceTemplateValue || "";
    const templateClean = templateRaw
      .split("|")[0]
      .trim()
      .replace(/^['"]|['"]$/g, "");
    setDsTemplate(templateClean);
    setDsLocation(info.datasourceLocation || "");

    if (!templateClean) return;

    try {
      const tFields = await getTemplateFields(
        client,
        sitecoreContextId,
        templateClean
      );
      
      let contentSummary = await generateContentSummary(tFields);
      let currentTimeStamp = Date.now().toString().slice(-6);
      let compNameUnique = compName?.toLowerCase() + "_" + currentTimeStamp;
      setNewItemName(compNameUnique);

      let contentSummary1 = contentSummary?.result?.map(
        (item: { name: any; reference: any }) => {
          item.name = item.name;
          return item;
        }
      );
      setFields(tFields); // (unchanged list of real template fields)

      // Initialize form values from AI-enriched field list so values render
      const init: FormValues = {};
      for (const f of contentSummary1 ?? []) {
        if (f.type === "Checkbox") {
          init[f.name] = Boolean(f.value);
        } else {
          init[f.name] = String(f.value ?? "");
        }
      }
      setFormValues(init);
    } finally {
      setIsPageLoading(false);
    }
  };

  const generateContentSummary = async (tFields: any) => {
    try {
      setLoading(true);
      setIsPageLoading(true);

      // 2️⃣ Send to third-party API
      const thirdPartyRes = await fetch("/api/chat-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedFile,
          tFields,
          prompt,
          brandWebsite,
        }),
      });

      if (!thirdPartyRes.ok) throw new Error("Third-party API call failed");

      const data = await thirdPartyRes.json();

      if (thirdPartyRes?.status == 200) {
        return data?.data;
      } else {
        setErrorAlert(
          "We're currently experiencing heavy traffic. Please try again in 5 to 15 minutes."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return [];
      }
    } catch (err) {
      setErrorAlert(
        "We're currently experiencing heavy traffic. Please try again in 5 to 15 minutes."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
      setIsPageLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, TemplateFieldMeta[]>();
    for (const f of fields) {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    }
    return map;
  }, [fields]);

  const renderInput = (f: TemplateFieldMeta) => {
    // console.log("fields values", f);
    const k = f.name;
    // const v = formValues[k];
    // const set = (nv: string | boolean) =>
    //   setFormValues((s) => ({ ...s, [k]: nv }));
    const isBase = f.section === "BaseTemplate";
    const v = isBase ? baseFormValues[k] : formValues[k];
    const set = (nv: string | boolean) => {
      if (isBase) {
        setBaseFormValues((s) => ({ ...s, [k]: nv }));
      } else {
        setFormValues((s) => ({ ...s, [k]: nv }));
      }
    };
    switch (f.type) {
      case "Checkbox":
        return (
          <label className="inline-flex items-center gap-2">
            <input
              name={f.name}
              type="checkbox"
              className="size-4"
              checked={Boolean(v)}
              onChange={(e) => set(e.target.checked)}
            />
            <span className="text-sm">Yes</span>
          </label>
        );
      case "Rich Text":
      case "Multi-Line Text":
        return (
          <textarea
            name={f.name}
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            rows={4}
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Integer":
      case "Number":
        return (
          <input
            name={f.name}
            type="number"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Date":
        return (
          <input
            name={f.name}
            type="date"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Datetime":
        return (
          <input
            name={f.name}
            type="datetime-local"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "General Link":
        return (
          <input
            name={f.name}
            type="url"
            placeholder="https://… or internal link"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "TreelistEx":
      case "Multilist":
      case "Treelist":
        return (
          <textarea
            name={f.name}
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            rows={2}
            placeholder="IDs/paths comma- or newline-separated"
            value={String(v ?? f.value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Droplink":
      case "Droptree":
      case "Image":
        return (
          <>
            <input
              name={f.name}
              type="file"
              style={{ display: "none" }}
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              onChange={(e) => set(e.target.value)}
            />
            <GetMediaItems
              appContext={appContext}
              client={client}
              onMediaSelect={(media) => {
                setFormValues((prev) => ({ ...prev, [f.name]: media.id }));
              }}
            />
          </>
        );
      case "File":
        return (
          <>
            <input
              name={f.name}
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300 "
              placeholder={f.source ? `source: ${f.source}` : ""}
              value={String(v ?? "")}
              onChange={(e) => set(e.target.value)}
            />
          </>
        );
      default:
        return (
          <input
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300 dynamic-input"
            name={f.name}
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
    }
  };

  /** Convert current form to simple [{name, value}] list for mutation */
  function toCreateFields(values: FormValues, metas: TemplateFieldMeta[]) {
    const list: { name: string; value: string }[] = [];
    for (const m of metas) {
      const raw = values[m.name];
      if (raw === undefined) continue;

      let value = "";
      switch (m.type) {
        case "Checkbox":
          value = (raw ? "1" : "0") as string;
          break;
        case "Image":
          value = `<image mediaid="${raw}" />`;
          break;
        case "General Link":
          value = `<link linktype="external" url="${raw}" anchor="" target="" />`;
          break;
        default:
          value = String(raw ?? "");
      }
      list.push({ name: m.name, value });
    }
    return list;
  }

  // Single latest object (kept)
  const [renderingDatasourceObject, setRenderingDatasourceObject] =
    useState<null | {
      renderingName: string;
      renderingId: string;
      dataSourceId: string;
      dataSourcePath: string;
    }>(null);

  // ARRAY: keep ALL created datasource entries
  const [renderingDatasourceObjects, setRenderingDatasourceObjects] = useState<
    Array<{
      renderingName: string;
      renderingId: string;
      dataSourceId: string;
      dataSourcePath: string;
    }>
  >([]);

  const HEX32 = /^[0-9A-F]{32}$/i;

  function toBracedDashedGuid(raw: string): string | null {
    if (!raw) return null;
    const hex = raw.replace(/[{}-]/g, "").toUpperCase();
    if (!HEX32.test(hex)) return null;
    return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
  }

  const onSaveDatasource = async () => {
    setSaveError("");
    setCreated(null);

    if (!client || !sitecoreContextId) return;
    if (!newItemName.trim()) {
      setSaveError("Please enter a name for the item.");
      return;
    }
    if (!dsTemplate) {
      setSaveError("Datasource Template not found for this rendering.");
      return;
    }

    try {
      setIsPageLoading(true);
      setSaving(true);

      // Resolve template id from cleaned template path/ID
      const templateId = await resolveTemplateId(
        client,
        sitecoreContextId,
        dsTemplate
      );
      const fieldsPayload = toCreateFields(formValues, fields);

      const item = await createItemFromTemplate(client, sitecoreContextId, {
        name: newItemName.trim(),
        parentId: PARENT_ID,
        templateId: templateId,
        fields: fieldsPayload,
      });

      // Normalize the datasource ID to proper {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX} format
      const normalizedDsId = toBracedDashedGuid(item.itemId);
      if (!normalizedDsId) {
        console.warn("[onSaveDatasource][invalid itemId format]", item.itemId);
      }

      const rdso = {
        renderingName: nameMap[activeRenderingId]?.name ?? "",
        renderingId: activeRenderingId,
        dataSourceId: normalizedDsId ?? item.itemId, // fallback if normalization fails
        dataSourcePath: item.path,
      };

      setRenderingDatasourceObject(rdso);
      console.log("[RenderingDataSourceObject]", rdso);

      setRenderingDatasourceObjects((s) => {
        const next = [...s, rdso];
        console.log("[RenderingDataSourceObject:All]", next);
        return next;
      });

      setCreated({ itemId: item.itemId, name: item.name, path: item.path });

      // Fetch Final Renderings XML for the newly created item
      const xml = await fetchFinalRenderingsXML(
        client!,
        sitecoreContextId,
        item.itemId
      );
      setBlogFinalRenderingsXML(xml);
    } catch (e: any) {
      setSaveError(e?.message || "Failed to create datasource item.");
    } finally {
      setSaving(false);
      setIsPageLoading(false);
    }
  };

  // === Create Blog Page (uses BASE form values only)
  const onCreateBlogPage = async () => {
    setPageError("");
    setPageCreated(null);

    if (!client || !sitecoreContextId) {
      setPageError("Client/context unavailable.");
      return;
    }
    if (!newPageName.trim()) {
      setPageError("Please enter a page name.");
      return;
    }

    try {
      setIsPageLoading(true);
      setCreatingPage(true);

      // Build fields from Base Page + _SEO (whatever you've collected)
      const pageMetas = pairsToMetas(pageFieldTypePairs);
      const fieldsPayload = toCreateFields(baseFormValues, pageMetas);

      // FORCE: Blog template (brace-wrapped, uppercased)
      const templateId = "{43C1BC5D-831F-47F8-9D03-D3BA6602A0FD}";

      // FORCE: Parent is “All Blogs”
      const parentId = BLOG_PARENT_ID;

      // Prefer the Page Name textbox, fallback to the auto item name if needed
      const pageName = newPageName.trim() || newItemName.trim();

      console.log("[CreateBlogPage][vars]", {
        pageName,
        parentId,
        templateId,
        fieldCount: fieldsPayload.length,
      });

      const item = await createItemFromTemplate(client, sitecoreContextId, {
        name: pageName,
        parentId: parentId,
        templateId: templateId,
        fields: fieldsPayload,
      });

      console.log('...............748.................',item);
      setCreated({ itemId: item.itemId, name: item.name, path: item.path });
      setCreatingPage(false);
    } catch (e: any) {
      console.error("[CreateBlogPage][ERROR]", e);
      setPageError(e?.message || "Failed to create blog page.");
    } finally {
      setCreatingPage(false); // re-enable the Create Page button
      setSaving(false);
      setIsPageLoading(false);
    }
  };

  // Ensure {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX} uppercase, with braces
  function toDashedGuid(raw: string): string | null {
    if (!raw) return null;
    const hex = (raw || "").toUpperCase().replace(/[{}-]/g, "");
    // must be exactly 32 hex
    if (!/^[0-9A-F]{32}$/.test(hex)) return null;
    const dashed = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    return `{${dashed}}`;
  }

  // Convenience normalizer for comparison (no braces/dashes, uppercase)
  function norm32(raw: string): string {
    return (raw || "").toUpperCase().replace(/[{}-]/g, "");
  }

  // === Helper: inject datasource IDs into Final Renderings XML ===
  function mergeDatasourcesIntoFinalRenderingsXml(
    xml: string,
    assignments: Array<{ renderingId: string; dataSourceId: string }>
  ): string {
    if (!xml || !assignments?.length) return xml;

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const rNodes = Array.from(doc.getElementsByTagName("r")); // all <r .../>

    for (const r of rNodes) {
      const sId = r.getAttribute("s:id");
      if (!sId) continue;

      const target = assignments.find(
        (a) => norm32(a.renderingId) === norm32(sId)
      );
      if (!target) continue;

      const dashedBracedDs = toDashedGuid(target.dataSourceId);
      if (!dashedBracedDs) {
        console.warn("[FinalRenderingsXML][skip-invalid-datasourceId]", {
          renderingId: sId,
          dataSourceId: target.dataSourceId,
        });
        continue; // do not write an invalid guid
      }

      r.setAttribute("s:ds", dashedBracedDs);
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  // Auto-merge Final Renderings XML when blogFinalRenderingsXML or renderings change
  useEffect(() => {
    if (!blogFinalRenderingsXML) return;

    const merged = mergeDatasourcesIntoFinalRenderingsXml(
      blogFinalRenderingsXML,
      (renderingDatasourceObjects ?? []).map((o) => ({
        renderingId: o.renderingId,
        dataSourceId: o.dataSourceId,
      }))
    );

    setBlogFinalRenderingsXMLUpdated(merged);
    console.log("[BlogItemFinalRenderingsXML:Updated]", merged);
  }, [blogFinalRenderingsXML, renderingDatasourceObjects]);

  const selectedInfo = activeRenderingId
    ? nameMap[activeRenderingId]
    : undefined;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {isPageLoading && (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-sm flex items-center justify-center" 
        style={{ 'backgroundColor': 'rgba(0, 0, 0, 0.5)', 'zIndex': 9999 }}>
          <div className="flex items-center gap-3 text-gray-700">
            <svg className="animate-spin h-6 w-6 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-sm font-medium">Loading…</span>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight">Screen 3</h1>
      <Card
        title="Generate Content"
        subtitle={
          selectedTemplateData
            ? `Template: ${selectedTemplateData.name} • Page Item ID: ${selectedTemplateData.itemID}`
            : "Select a template to continue"
        }
      />

      {/* 3) Renderings UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Renderings"
          subtitle="Click a rendering to load its fields"
        >
          {!namesReady ? (
            <div className="space-y-2">
              <div className="h-7 w-28 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-7 w-36 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-7 w-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="text-xs text-gray-500">Resolving renderings…</div>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="flex flex-wrap gap-2">
                {renderings.map((r) => {
                  const guid = normalizeGuid(r.componentId);
                  const info = nameMap[guid];
                  if (!info) return null;

                  const tooltip = [
                    `Rendering: ${info.name}`,
                    `Placeholder: ${r.placeholder}`,
                    `Path: ${info.path || "-"}`,
                    `Datasource Template: ${
                      dsTemplate || info.datasourceTemplateValue || "-"
                    }`,
                    `Datasource Location: ${
                      dsLocation || info.datasourceLocation || "-"
                    }`,
                    selectedTemplateData
                      ? `Template: ${selectedTemplateData.name}`
                      : "",
                    selectedTemplateData
                      ? `Page Item ID: ${selectedTemplateData.itemID}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <li key={r.uid}>
                      <Chip
                        label={info.name}
                        title={tooltip}
                        active={activeRenderingId === guid}
                        onClick={() => onClickRendering(guid, info.name)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {fields.length > 0 ? (
            <>
              <Card
                title={`Fields for: ${selectedInfo?.name ?? "—"}`}
                subtitle={[
                  dsTemplate ? `Datasource Template: ${dsTemplate}` : "",
                  dsLocation ? `Datasource Location: ${dsLocation}` : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              >
                {/* Dynamic form */}
                {[...grouped.entries()].map(([section, items]) => (
                  <div key={section || "default"} className="mb-5 last:mb-0">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {section || "Fields"}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((f, i) => (
                        <label key={`${section}/${i}`} className="block">
                          <div className="text-xs mb-1">
                            <span className="font-semibold">{f.name}</span>{" "}
                            <span className="text-gray-500">
                              ({f.type || "Text"})
                            </span>
                            {f.source ? (
                              <span className="text-gray-400">{` — ${f.source}`}</span>
                            ) : null}
                          </div>

                          {f.longDescription || f.shortDescription ? (
                            <div className="text-[11px] text-gray-600 mb-2 leading-snug">
                              Help Text:{" "}
                              {f.longDescription || f.shortDescription}
                            </div>
                          ) : null}
                          {renderInput(f)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Create item controls */}
                <div className="mt-4 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">
                      Item Name
                    </label>
                    <input
                      className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g., CarouselItem1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onSaveDatasource}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save Datasource"}
                  </button>
                </div>

                {saveError && (
                  <div className="text-sm text-red-600 mt-2">{saveError}</div>
                )}
                {created && (
                  <div className="text-sm text-green-700 mt-2">
                    Created: <strong>{created.name}</strong> (
                    <code>{created.itemId}</code>) — {created.path}
                  </div>
                )}
              </Card>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={() => setFormValues({})}
                >
                  Reset Form
                </button>
              </div>
            </>
          ) : (
            <Card title="No rendering selected">
              <div className="text-sm text-gray-600">
                Choose a rendering on the left to see its fields.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* === BOTTOM: Create Blog Page === */}
      <Card
        title="Create Blog Page"
        subtitle="Create a new blog page under ‘All Blogs’"
      >
        {
        isBaseFormLoader ? (
          <>
            <></>
          </>
        ) : (
              pageFieldTypePairs.length > 0 && (
                <Card
                  title="Base Template Fields"
                  subtitle="Auto-generated from Page and _Seo Metadata templates"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pageFieldTypePairs.map(({ fieldName, fieldType }, index) => {
                      const meta: TemplateFieldMeta = {
                        section: "BaseTemplate",
                        name: fieldName,
                        type: fieldType,
                        value: undefined,
                      };
                      return (
                        <label
                          key={`BaseTemplate/${fieldName}-${index}`}
                          className="block"
                        >
                          <div className="text-xs mb-1">
                            <span className="font-semibold">{fieldName}</span>{" "}
                            <span className="text-gray-500">({fieldType})</span>
                          </div>
                          {(() => {
                            const k = meta.name;
                            const v = baseFormValues[k];
                            const set = (nv: string | boolean) =>
                              setBaseFormValues((s) => ({ ...s, [k]: nv }));
                            if (meta.type === "Checkbox") {
                              return (
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    name={meta.name}
                                    type="checkbox"
                                    className="size-4"
                                    checked={Boolean(v)}
                                    onChange={(e) => set(e.target.checked)}
                                  />
                                  <span className="text-sm">Yes</span>
                                </label>
                              );
                            }
                            return (
                              <input
                                className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                name={meta.name}
                                value={String(v ?? "")}
                                onChange={(e) => set(e.target.value)}
                              />
                            );
                          })()}
                        </label>
                      );
                    })}
                  </div>
                </Card>
          )
        )}           
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">
              Page Name
            </label>
            <input
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              placeholder="New Blog Item Name"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onCreateBlogPage}
              disabled={creatingPage}
              className="px-4 py-2 rounded-lg border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {creatingPage ? "Creating…" : "Create Page"}
            </button>
          </div>
        </div>

        {pageError && (
          <div className="text-sm text-red-600 mt-2">{pageError}</div>
        )}
        {pageCreated && (
          <div className="text-sm text-green-700 mt-2">
            Created: <strong>{pageCreated.name}</strong> (
            <code>{pageCreated.itemId}</code>) — {pageCreated.path}
          </div>
        )}
        
         {created && (
            <div className="text-sm text-green-700 mt-2">
              Created: <strong>{created.name}</strong> (
              <code>{created.itemId}</code>) — {created.path}
            </div>
          )}
      </Card>
    </div>
  );
}
