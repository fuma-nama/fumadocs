'use client';
import { createGraphQLPage } from '@/ui';
import { renderedSchemas } from '@/utils/rendered';

/** `loadSchema` of the page of `graphqlPlugin()`: on the server, it reads schemas of the pages rendered in the process */
export function loadSchema(url: string): Promise<string> {
  return renderedSchemas.load(url, (response) => response.text());
}

/** the page of `graphqlPlugin()`, the `schema` of its props is the URL of a schema left out of them */
export const GraphQLPage = createGraphQLPage({ loadSchema });
