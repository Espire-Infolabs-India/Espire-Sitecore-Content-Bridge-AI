export const GET_MEDIAPATH = (path: string) => `
      query {
        item(where: { path: "${path}" }) {
          name
          path
          itemId
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
            }
          }
        }
      }
    `;