export const getPageTemplates = `
query {
  item {
    children {
      nodes {
        name
        itemId
        children {
          nodes {
            template {
              standardValuesItem {
                field {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
}`;
