export const GET_ITEM_ID_BY_PATH = `
query getItemIdByPath($path: String!) {
  item(where: { path: $path }) {
    itemId
    name
    displayName
  }
}
`;