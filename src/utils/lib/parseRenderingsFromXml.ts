import { XMLParser } from "fast-xml-parser";

export interface RenderingInfo {
  uid: string;
  componentId: string;
  placeholder: string;
  parameters?: string;
}

/**
 * Parses Sitecore layout XML and extracts renderings.
 * @param xmlData - XML layout value (from GraphQL standardValuesItem field)
 * @returns Array of renderings (uid, componentId, placeholder, parameters)
 */
export function parseRenderingsFromXml(xmlData: string): RenderingInfo[] {
  if (!xmlData) return [];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const parsed = parser.parse(xmlData);

  if (!parsed?.r?.d?.r) return [];

  const renderings = parsed.r.d.r;
  const renderingList = Array.isArray(renderings) ? renderings : [renderings];

  return renderingList.map((r: any) => ({

    componentId: r["s:id"] || r["id"],
    placeholder: r["s:ph"] || r["ph"],
    uid: r.uid,
    parameters: r["s:par"],
  }));
}
