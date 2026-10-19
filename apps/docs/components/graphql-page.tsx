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
});
