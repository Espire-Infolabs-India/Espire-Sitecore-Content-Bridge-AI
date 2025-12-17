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

export interface RenderingInfo {
  itemId: string;
  name: string;
  path: string;
  datasourceTemplateValue: string | null; // path or {GUID}
  datasourceLocation: string | null;
}

export interface TemplateFieldMeta {
  value: any;
  section: string;
  name: string;
  type: string;
  source?: string;
  shared?: boolean;
  unversioned?: boolean;
  shortDescription?: string;
  longDescription?: string;
}

// Common envelope shape from Marketplace SDK mutate
export type MutateReturn<T> = {
  data?: { data?: T; errors?: Array<{ message?: string }> };
  errors?: Array<{ message?: string }>;
};

export interface RenderingInfo {
  itemId: string;
  name: string;
  path: string;
  datasourceTemplateValue: string | null;
  datasourceLocation: string | null;
}

export interface TemplateFieldMeta {
  value: any;
  section: string;
  name: string;
  type: string;
  source?: string;
  shared?: boolean;
  unversioned?: boolean;
  shortDescription?: string;
  longDescription?: string;
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

export type BasicItemInfo = {
  itemId: string;
  name: string;
  displayName?: string;
  path: string;
};

export type DataRootInfo = {
  dataRootId: string;
  dataRootPath: string;
};

// --- GraphQL response types used inside cmsAuthoring helpers ---

export type GenerateContentSettingsParentsResult = {
  item?: {
    imageDatasourceParent?: { value?: string | null } | null;
    promoDatasourceParent?: { value?: string | null } | null;
    carouselDatasourceParent?: { value?: string | null } | null;
    bannerDatasourceParent?: { value?: string | null } | null;
  } | null;
};

export type HomeCandidatesResult = {
  item?: {
    path?: string;
    children?: {
      nodes?: Array<{
        name?: string;
        path?: string;
        itemId?: string;
        children?: {
          nodes?: Array<{
            name?: string;
            path?: string;
            itemId?: string;
            children?: {
              nodes?: Array<{
                name?: string;
                path?: string;
                itemId?: string;
              }>;
            };
          }>;
        };
      }>;
    };
  } | null;
};

export type ItemPathByIdResult = {
  item?: { itemId?: string; name?: string; path?: string } | null;
};

export type ChildrenWithTemplateResult = {
  item?: {
    children?: {
      nodes?: Array<{
        itemId?: string;
        name?: string;
        path?: string;
        template?: { name?: string } | null;
      } | null>;
    } | null;
  } | null;
};

export type FinalRenderingsQueryResult = {
  item?: { field?: { value?: string | null } | null } | null;
};
