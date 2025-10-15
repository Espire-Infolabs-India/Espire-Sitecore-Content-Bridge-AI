export const GET_RENDERING_DATASOURCE_FIELDS = `
query getRenderingDatasourceFiled($where: ItemQueryInput!) {
  item(where: $where) {
    itemId
    name
    path
    children {                # Template Sections
      nodes {
        name
        children {            # Template Fields
          nodes {
            itemId
            name
            fields(excludeStandardFields: false) {  # include Type/Source/Shared/Unversioned
              nodes { name value }
            }
          }
        }
      }
    }
  }
}
`;
