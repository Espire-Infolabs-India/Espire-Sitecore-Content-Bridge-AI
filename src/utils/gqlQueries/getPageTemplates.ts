export const getPageTemplates = {
  query: `query {
  item(where: { path: "/sitecore/templates/Feature/Espire Accelerator/Landing Page" }) {
    children {
      nodes {
        name
        itemId
        displayName
      }
    }
  }
}
`,
  variables: {
    "path": "/sitecore/templates/Feature/Espire Accelerator/Landing Page",
  },
};
