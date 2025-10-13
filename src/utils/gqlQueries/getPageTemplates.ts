export const getPageTemplates = {
  query: `query ($path: String!) {
  item(where: { path: $path }) {
    children {
      nodes {
        name
        itemId
        children {
          nodes {
            template {
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
    path: "/sitecore/templates/Feature/Espire Accelerator/Landing Page",
  },
};
