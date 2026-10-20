'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { preload } from 'react-dom';
import { createGraphQLPage } from '@fumadocs/graphql/ui';

export const GraphQLPage = createGraphQLPage({
  shikiOptions: defaultShikiOptions,
  playground: {
    url: '/api/graphql',
    // Next.js route handlers can't serve WebSockets, so subscriptions use GraphQL over SSE
    subscriptionUrl: '/api/graphql',
  },
  async loadSchema(id) {
    if (typeof window === 'undefined') {
      preload(`/api/graphql-schema/${id}`, { as: 'fetch', crossOrigin: 'anonymous' });
      const { graphql } = await import('@/lib/graphql');
      return (await graphql.getSchema(id)).sdl;
    }
    return (await fetch(`/api/graphql-schema/${id}`)).text();
  },
});
