'use client';
import { createGraphQLPage } from '@fumadocs/graphql/ui';

export const GraphQLPage = createGraphQLPage({
  playground: {
    url: '/api/graphql',
  },
});
