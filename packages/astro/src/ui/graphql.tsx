import type { ComponentType } from 'react';
import type { GraphQLPageData } from '@fumadocs/graphql/server';
import { createGraphQLPage, type GraphQLPageProps } from '@fumadocs/graphql/ui';
import { components } from 'virtual:fumadocs/components';
import { getBase } from '../shared';
import { withContentProvider } from './provider';

type Schema = ReturnType<GraphQLPageData['getSchema']>;

/** the props of `GraphQLPage.astro`, besides `provider` */
export interface BodyProps {
  page: GraphQLPageProps;
  /** the schema left out of `page`, with `includeSchema: false` */
  schema?: Schema;
}

export function schemaUrl(id: string) {
  return `${getBase()}/api/graphql-schema/${id}`;
}

/** the SDL of schemas left out of page props, for server rendering */
export const schemas: Map<string, Schema['sdl']> = new Map();

// `<GraphQLPage />` of the MDX components replaces the default
export const APIPage = withContentProvider(
  (components.GraphQLPage as ComponentType<GraphQLPageProps> | undefined) ??
    createGraphQLPage({
      async loadSchema(id) {
        if (import.meta.env.SSR) return schemas.get(id)!;
        return (await fetch(schemaUrl(id))).text();
      },
    }),
);
