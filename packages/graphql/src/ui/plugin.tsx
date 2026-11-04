'use client';
import { createGraphQLPage } from '@/ui';
import { renderedSchemas } from '@/utils/rendered';

/** the page of `graphqlPlugin()`, the `schema` of its props is the URL of a schema left out of them */
export const GraphQLPage = createGraphQLPage({
  loadSchema: (url) => renderedSchemas.load(url, (response) => response.text()),
});
