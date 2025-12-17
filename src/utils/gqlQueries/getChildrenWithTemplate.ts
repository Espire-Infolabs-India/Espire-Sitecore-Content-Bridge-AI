export const GET_CHILDREN_WITH_TEMPLATE = `
  query GetChildrenWithTemplate($where: ItemQueryInput!) {
    item(where: $where) {
      children {
        nodes {
          itemId
          name
          path
          template { name }
        }
      }
    }
  }
`;