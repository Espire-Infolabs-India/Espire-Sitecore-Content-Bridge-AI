export interface RenderingFromXml {
  componentId: string;
  placeholder: string;
  uid: string;
}

export interface RenderingInfo {
  itemId: string;
  name: string;
  path: string;
  datasourceTemplateValue: string | null;
  datasourceLocation: string | null;
}

export interface TemplateFieldMeta {
  section: string;
  name: string;
  type: string;
  source?: string;
  shared?: boolean;
  unversioned?: boolean;
  shortDescription?: string;
  longDescription?: string;
}

export interface SdkGraphQLEnvelope<T> {
  data?: { data?: T };
}
