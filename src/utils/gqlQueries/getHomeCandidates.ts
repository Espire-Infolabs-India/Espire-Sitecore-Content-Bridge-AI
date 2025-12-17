export const GET_HOME_CANDIDATES = `
  query GetHomeCandidates($where: ItemQueryInput!) {
    item(where: $where) {
      path
      children {
        nodes {
          name
          path
          itemId
          children {
            nodes {
              name
              path
              itemId
              children {
                nodes {
                  name
                  path
                  itemId
                }
              }
            }
          }
        }
      }
    }
  }
`;
