import {Form, Link, useLoaderData} from '@remix-run/react';
import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import {json} from '@remix-run/server-runtime';
import type {Product} from '@shopify/hydrogen/storefront-api-types';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context}: LoaderFunctionArgs) {
  const {data: customerData, errors: customerErrors} =
    await context.customerAccount.query(CUSTOMER_DETAILS_QUERY);

  if (customerErrors?.length || !customerData?.customer) {
    throw new Error('Customer not found');
  }

  const response = await fetch(
    `${context.env.PUBLIC_FAVORITES_MS_API_URL}/api/favorites/${
      customerData.customer.id.split('/')[3]
    }`,
    {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
      },
    },
  );

  const favoritesData: Favorite[] = (await response.json()) as Favorite[];

  if (!response.ok) {
    throw new Error('Customer favorites not found');
  }

  const buildProductsQuery = (favorites: Favorite[]): string[] => {
    if (!favorites?.length || !favorites) return [''];

    return favorites.map(
      (favorite) => `gid://shopify/Product/${favorite.productId}`,
    );
  };

  const {nodes: productsData, errors: productsErrors} =
    await context.storefront.query(PRODUCTS_BY_IDS_QUERY, {
      variables: {
        ids: buildProductsQuery(favoritesData),
      },
    });

  if (productsErrors?.length && favoritesData.length > 0) {
    throw new Error('Products not found');
  }

  return json(
    {favorites: productsData},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method === 'DELETE') {
    const values = await request.formData();
    const response = await fetch(
      `${context.env.PUBLIC_FAVORITES_MS_API_URL}/api/favorites/${
        String(values.get('favoriteId'))?.split('/')[4]
      }`,
      {
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to remove favorite');
    }

    return json(
      {},
      {
        headers: {
          'Set-Cookie': await context.session.commit(),
        },
      },
    );
  }
}

export default function AccountFavorites() {
  const {favorites} = useLoaderData<{
    favorites: Product[];
  }>();

  return (
    <div className="favorites-container">
      {favorites?.length > 0 ? (
        favorites.map((favorite: Product) => (
          <Form method="POST" key={favorite.id} className="favorite-card">
            <label htmlFor="favoriteId">{favorite.title}</label>
            <input
              id="favoriteId"
              name="favoriteId"
              type="hidden"
              value={favorite.id}
            />
            <button formMethod="DELETE" type="submit">
              Remove favorite
            </button>
          </Form>
        ))
      ) : (
        <div>
          <p>You haven&apos;t placed any favorites yet.</p>
          <br />
          <p>
            <Link to="/collections/all">Start Shopping →</Link>
          </p>
        </div>
      )}
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
        id
        altText
        url
        width
        height
    }
}
` as const;

const PRODUCTS_BY_IDS_QUERY = `#graphql
query Products($ids: [ID!]!) {
    nodes(ids: $ids) {
        ... on Product {
            ...ProductItem
        }
    }
}
${PRODUCT_ITEM_FRAGMENT}
` as const;
