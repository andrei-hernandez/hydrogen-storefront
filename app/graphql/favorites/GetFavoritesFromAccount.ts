export const CUSTOMER_FAVORITES_QUERY = `#graphql:favorites
  query CustomerFavorites {
    favorite {
      id
    }
  }
` as const;
