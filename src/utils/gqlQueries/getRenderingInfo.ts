export const GET_RENDERING_INFO = `
query GetRenderingInfo($where: ItemQueryInput!) {
  item(where: $where) {
    itemId
    name
    path
    datasourceLocation: field(name: "Datasource Location") { value }
    datasourceTemplate: field(name: "Datasource Template") { value }
  }
}
`;