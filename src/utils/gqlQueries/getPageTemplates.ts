export const getPageTemplates = {
  query: `query {
  item(where: { path: "/sitecore/templates/Project/EspireDemo" }) {
    hasChildren
    children {
      nodes {
        name
      }
    }
  }
}
`,
};
