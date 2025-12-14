// utils/gqlQueries/getTemplatesByPath.ts

export const getTemplatesByPathQuery = {
  query: `
    query ($path: String!) {
      item(where: { path: $path }) {
        path
        children {
          nodes {
            # this is the “folder” or “template item” (e.g. Common, Page Types, Content)
            name
            displayName
            itemId
            path

            template {
              name
              standardValuesItem(language: "en") {
                name
                field(name: "__Final Renderings") {
                  name
                  value
                }
              }
            }

            # children of this item (e.g. "__Standard Values")
            children {
              nodes {
                name
                displayName
                itemId
                path
                template {
                  name
                  standardValuesItem(language: "en") {
                    name
                    field(name: "__Final Renderings") {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  variables: {
    path: "/sitecore/templates/Project",
  },
};
