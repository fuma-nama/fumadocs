'use client';

import dynamic from 'next/dynamic';

export const OpenAPIPageLazy = dynamic(() =>
  import('@/components/openapi-page').then((mod) => mod.OpenAPIPage),
);

export const AsyncAPIPageLazy = dynamic(() =>
  import('@/components/asyncapi-page').then((mod) => mod.AsyncAPIPage),
);

export const GraphQLPageLazy = dynamic(() =>
  import('@/components/graphql-page').then((mod) => mod.GraphQLPage),
);
