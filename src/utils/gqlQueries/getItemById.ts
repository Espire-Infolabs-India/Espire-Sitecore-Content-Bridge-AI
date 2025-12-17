export const GET_ITEM_BY_ID = `
  query GetItemById($where: ItemQueryInput!) {
    item(where: $where) {
      itemId
      name
      path
      displayName
    }
  }
`;
