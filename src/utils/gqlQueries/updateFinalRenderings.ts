// utils/gqlQueries/updateFinalRenderings.ts
export const UPDATE_FINAL_RENDERINGS = `
  mutation UpdateDatasource($itemId: ID!, $xml: String!) {
    updateItem(
      input: {
        itemId: $itemId
        fields: [
          {
            name: "__Final Renderings"
            value: $xml
          }
        ]
      }
    ) {
      item {
        itemId
        name
      }
    }
  }
`;
