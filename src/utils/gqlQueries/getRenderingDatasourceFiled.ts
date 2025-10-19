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
             shortdescription: field(name: "__Short description") {
              value
            }
            longdescription: field(name: "__Long description") {
              value
            }
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
