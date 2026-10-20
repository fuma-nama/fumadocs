'use client';
import { defaultShikiOptions } from '@/lib/shiki';
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
      const { graphql } = await import('@/lib/graphql');
      return (await graphql.getSchema(id)).sdl;
    }

    const res = await fetch(`/api/graphql-schema/${id}`);
    return res.text();
  },
});
