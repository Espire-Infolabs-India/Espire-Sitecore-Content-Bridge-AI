// utils/lib/parseRenderingsFromXml.ts

export interface RenderingFromXml {
  componentId: string;  // "{GUID}"
  placeholder: string;
  uid: string;          // "{GUID}"
}

/**
 * Parse __Final Renderings XML (Sitecore layout) and extract s:id, s:ph, uid.
 * Works in browser (DOMParser). Falls back to a light regex if DOMParser missing.
 */
export function parseRenderingsFromXml(xml: string): RenderingFromXml[] {
  const trimmed = (xml || "").trim();
  if (!trimmed) return [];

  // Try DOMParser first
  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "text/xml");
      const nodes = Array.from(doc.getElementsByTagName("r"));
      const items: RenderingFromXml[] = [];

      for (const el of nodes) {
        const compId = el.getAttribute("s:id") || "";
        const ph = el.getAttribute("s:ph") || "";
        const uid = el.getAttribute("uid") || "";
        if (compId && uid) {
          items.push({
            componentId: compId.toUpperCase(),
            placeholder: ph,
            uid: uid.toUpperCase(),
          });
        }
      }
      if (items.length > 0) return items;
    } catch {
      // fall through to regex
    }
  }

  // Fallback: lightweight regex (not full XML) — good enough for s:id / s:ph / uid attributes
  const result: RenderingFromXml[] = [];
  const rTag = /<r\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = rTag.exec(trimmed)) !== null) {
    const tag = match[0];
    const idMatch = /s:id="([^"]+)"/i.exec(tag);
    const phMatch = /s:ph="([^"]+)"/i.exec(tag);
    const uidMatch = /uid="([^"]+)"/i.exec(tag);

    const id = idMatch ? idMatch[1].toUpperCase() : "";
    const ph = phMatch ? phMatch[1] : "";
    const uid = uidMatch ? uidMatch[1].toUpperCase() : "";

    if (id && uid) {
      result.push({ componentId: id, placeholder: ph, uid });
    }
  }

  return result;
}
