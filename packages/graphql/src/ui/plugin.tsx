'use client';
import { preload } from 'react-dom';
import { createGraphQLPage } from '@/ui';
import { renderedSchemas } from '@/utils/rendered';

/** the page of `graphqlPlugin()`, the `schema` of its props is the URL of a schema left out of them */
export const GraphQLPage = createGraphQLPage({
  async loadSchema(url) {
    if (typeof window !== 'undefined') return (await fetch(url)).text();

    // the browser starts downloading it with the page
    preload(url, { as: 'fetch', crossOrigin: 'anonymous' });
    const sdl = renderedSchemas().get(url);
    if (sdl === undefined)
      throw new Error(
        `[Fumadocs GraphQL] the schema "${url}" is not of a page rendered by \`graphqlPlugin()\` in this process.`,
      );
    return sdl;
  },
});
