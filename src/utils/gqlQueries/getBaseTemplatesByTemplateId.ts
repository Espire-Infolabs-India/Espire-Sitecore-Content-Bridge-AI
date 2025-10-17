export const WHICH_BASE_TEMPLATES_BY_ID = `
  query WhichBaseTemplatesById($templateId: ID!) {
    itemTemplate(where: { database: "master", templateId: $templateId }) {
      name
      fullName
      templateId
      baseTemplates {
        edges {
          node {
            name
            fullName
            templateId
          }
        }
      }
    }
  }
`;
