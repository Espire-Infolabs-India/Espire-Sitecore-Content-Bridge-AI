
export const CREATE_ITEM_FROM_TEMPLATE = `
mutation CreateItemFromTemplate(
  $name: String!
  $parentId: ID!
  $templateId: ID!
  $fields: [FieldInput!]!
) {
  createItem(
    input: {
      name: $name
      parent: $parentId
      templateId: $templateId
      fields: $fields
    }
  ) {
    item {
      itemId
      name
      displayName
      path
      template { name fullName }
    }
  }
}
`;