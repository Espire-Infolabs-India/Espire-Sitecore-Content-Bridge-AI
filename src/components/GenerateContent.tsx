"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";

import {
  getTemplateFields,
  resolveRendering,
  normalizeGuid,
  resolveTemplateId,
  createItemFromTemplate,
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
}: {
  appContext: { resourceAccess?: Array<{ context?: { preview?: string } }> };
  client: ClientSDK | null;
  selectedTemplateData: ExtractedItem | null;
  selectedFile: any;
}) {
  const sitecoreContextId =
    appContext?.resourceAccess?.[0]?.context?.preview ?? "";

  const [renderings, setRenderings] = useState<RenderingFromXml[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, RenderingInfo>>({});
  const [namesReady, setNamesReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');
  

  const [activeRenderingId, setActiveRenderingId] = useState<string>("");
  const [fields, setFields] = useState<TemplateFieldMeta[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [dsTemplate, setDsTemplate] = useState<string>("");
  const [dsLocation, setDsLocation] = useState<string>("");

  // Hard-coded parent (as you wanted)
  const PARENT_ID = "{19175065-C269-4A6D-A2BA-161E7957C2F8}";
  const [newItemName, setNewItemName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [created, setCreated] = useState<null | { itemId: string; name: string; path: string }>(null);

  // Parse XML & resolve ALL names; render chips only when all are ready
  useEffect(() => {
    setRenderings([]);
    setNameMap({});
    setActiveRenderingId("");
    setFields([]);
    setFormValues({});
    setDsTemplate("");
    setDsLocation("");
    setNamesReady(false);

    if (!client || !sitecoreContextId || !selectedTemplateData?.finalRenderings) {
      setNamesReady(true);
      return;
    }

    const list = parseRenderingsFromXml(selectedTemplateData.finalRenderings);
    setRenderings(list);

    if (list.length === 0) {
      setNamesReady(true);
      return;
    }

    const guids = Array.from(new Set(list.map((r) => normalizeGuid(r.componentId))));

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
          map[xmlGuid] = info; // index also by XML guid
        }
      }
      setNameMap(map);
      setNamesReady(true);
    })();
  }, [client, sitecoreContextId, selectedTemplateData?.finalRenderings]);

  // Click → load template fields from datasource template
  const onClickRendering = async (componentIdRaw: string) => {
    if (!client || !sitecoreContextId) return;
    const componentId = normalizeGuid(componentIdRaw);

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

    // Clean the template value: remove anything after | and strip quotes
    const templateRaw = info.datasourceTemplateValue || "";
    const templateClean = templateRaw.split("|")[0].trim().replace(/^['"]|['"]$/g, "");
    setDsTemplate(templateClean);
    setDsLocation(info.datasourceLocation || "");

    if (!templateClean) return;

    const tFields = await getTemplateFields(client, sitecoreContextId, templateClean);
    console.log('_______________________tFields',tFields);
    let contentSummary = await generateContentSummary(tFields);
    console.log('_______________________contentSummary after ',contentSummary.summary.result);

    setFields(contentSummary.summary.result);

    const init: FormValues = {};
    for (const f of tFields) init[f.name] = f.type === "Checkbox" ? false : "";
    setFormValues(init);
  };

  const generateContentSummary = async (tFields:any) => {
    //setLoading(true);
    const formData = new FormData();
    formData.append("tFields", JSON.stringify(tFields));
    formData.append("model", "custom");
    formData.append("pdf", selectedFile);

    try {
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        body: formData,
      });

      if (res?.status == 200) {
        const data = await res.json();
        console.log('_________________generateContentSummary', data);
        return data;
        //setResult(data);
      } else {
        setErrorAlert(
          "We're currently experiencing heavy traffic. Please try again in 5 to 15 minutes."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return [];
      }
    } catch (err) {
      //setCancel();
      //setFirstPage(true);
      setErrorAlert(
        "We're currently experiencing heavy traffic. Please try again in 5 to 15 minutes."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
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
    console.log('fields values',f);
    const k = f.name;
    const v = formValues[k];
    const set = (nv: string | boolean) =>
      setFormValues((s) => ({ ...s, [k]: nv }));

    switch (f.type) {
      case "Checkbox":
        return (
          <label className="inline-flex items-center gap-2">
            <input
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
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            rows={4}
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Integer":
      case "Number":
        return (
          <input
            type="number"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Date":
        return (
          <input
            type="date"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Datetime":
        return (
          <input
            type="datetime-local"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "General Link":
        return (
          <input
            type="url"
            placeholder="https://… or internal link"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "TreelistEx":
      case "Multilist":
      case "Treelist":
        return (
          <textarea
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            rows={2}
            placeholder="IDs/paths comma- or newline-separated"
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      case "Droplink":
      case "Droptree":
      case "Image":
      case "File":
        return (
          <input
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder={f.source ? `source: ${f.source}` : ""}
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
          />
        );
      default:
        return (
          <input
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={f.value}
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
          value = (raw ? "1" : "0") as string; // Sitecore accepts 1/0 for checkbox
          break;
        default:
          value = String(raw ?? "");
      }
      list.push({ name: m.name, value });
    }
    return list;
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
      setSaving(true);

      // Resolve template id from cleaned template path/ID
      const templateId = await resolveTemplateId(client, sitecoreContextId, dsTemplate);

      // Build fields payload from form
      const fieldsPayload = toCreateFields(formValues, fields);

      // Create the item (fields are inlined inside the mutation)
      const item = await createItemFromTemplate(client, sitecoreContextId, {
        name: newItemName.trim(),
        parentId: PARENT_ID,
        templateId,
        fields: fieldsPayload,
      });

      setCreated({ itemId: item.itemId, name: item.name, path: item.path });
    } catch (e: any) {
      setSaveError(e?.message || "Failed to create datasource item.");
    } finally {
      setSaving(false);
    }
  };

  const selectedInfo = activeRenderingId ? nameMap[activeRenderingId] : undefined;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Screen 3</h1>
      <Card
        title="Generate Content"
        subtitle={
          selectedTemplateData
            ? `Template: ${selectedTemplateData.name} • Page Item ID: ${selectedTemplateData.itemID}`
            : "Select a template to continue"
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Renderings" subtitle="Click a rendering to load its fields">
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
                    `Datasource Template: ${dsTemplate || info.datasourceTemplateValue || "-"}`,
                    `Datasource Location: ${dsLocation || info.datasourceLocation || "-"}`,
                    selectedTemplateData ? `Template: ${selectedTemplateData.name}` : "",
                    selectedTemplateData ? `Page Item ID: ${selectedTemplateData.itemID}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <li key={r.uid}>
                      <Chip
                        label={info.name}
                        title={tooltip}
                        active={activeRenderingId === guid}
                        onClick={() => onClickRendering(guid)}
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
                      {items.map((f) => (
                        <label key={`${section}/${f.name}`} className="block">
                          <div className="text-xs mb-1">
                            <span className="font-semibold">{f.name}</span>{" "}
                            <span className="text-gray-500">({f.type || "Text"})</span>
                            {f.source ? (
                              <span className="text-gray-400">{` — ${f.source}`}</span>
                            ) : null}
                          </div>
                          {renderInput(f)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Create item controls */}
                <div className="mt-4 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">Item Name</label>
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

                {saveError && <div className="text-sm text-red-600 mt-2">{saveError}</div>}
                {created && (
                  <div className="text-sm text-green-700 mt-2">
                    Created: <strong>{created.name}</strong>{" "}
                    (<code>{created.itemId}</code>) — {created.path}
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
    </div>
  );
}
