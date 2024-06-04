import {render, screen} from '@testing-library/react';

import {createRemixStub} from '@remix-run/testing';
import {json} from '@shopify/remix-oxygen';
import React from 'react';
import Collections from '../app/routes/($locale).collections.all';

import '@testing-library/jest-dom';

test('App', () => {
  const RemixStub = createRemixStub([
    {
      path: '/collections/all',
      Component: (<Collections />) as unknown as React.ComponentType,
      loader() {
        return json({products: []});
      },
    },
  ]);

  it('renders the App component', () => {
    render(<RemixStub />);
    screen.debug(); // prints out the jsx in the App component unto the command line
  });
});
