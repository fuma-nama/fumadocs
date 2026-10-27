'use client';
import { preload } from 'react-dom';
import { createGraphQLPage } from '@fumadocs/graphql/ui';
import { apiHighlighter } from '@/lib/highlighter';

/** the docs' GraphQL page, laid out to fit one screen */
export const GraphQLPage = createGraphQLPage({
  highlighter: apiHighlighter,
  playground: {
    url: '/api/graphql',
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
  content: {
    // the example query beside the operation once there is room, the long list it returns left out
    renderOperationLayout: (slots) => (
      <div className="grid gap-x-6 gap-y-4 @xl:grid-cols-2">
        <div className="min-w-0">
          {slots.playground}
          <div className="my-4 empty:hidden">{slots.description}</div>
          {slots.arguments}
        </div>
        <div className="min-w-0 @max-xl:hidden">{slots.example}</div>
      </div>
    ),
  },
});
