export const GET_ITEM_PATH_BY_ID = `
  query GetItemPathById($where: ItemQueryInput!) {
    item(where: $where) {
      itemId
      name
      path
    }
  }
`;
