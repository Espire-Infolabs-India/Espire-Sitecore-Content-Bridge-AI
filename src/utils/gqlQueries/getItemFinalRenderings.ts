export const GET_ITEM_FINAL_RENDERINGS = (itemId: string) => `
  query {
    item(where: { itemId: "${itemId}" }) {
      field(name: "__Final Renderings") {
        value
      }
    }
  }
`;
