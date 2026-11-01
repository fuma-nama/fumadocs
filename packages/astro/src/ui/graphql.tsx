import type { ComponentType } from 'react';
import { createGraphQLPage, type GraphQLPageProps } from '@fumadocs/graphql/ui';
import { components } from 'virtual:fumadocs/components';
import { ContentProvider, type ProviderData } from './provider';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function schemaUrl(id: string) {
  return `${base}/api/graphql-schema/${id}`;
}

/** the SDL of schemas left out of page props, for server rendering */
export const schemas = new Map<string, string>();

// `<GraphQLPage />` of the MDX components replaces the default
const GraphQLPage =
  (components.GraphQLPage as ComponentType<GraphQLPageProps> | undefined) ??
  createGraphQLPage({
    async loadSchema(id) {
      if (import.meta.env.SSR) return schemas.get(id)!;
      return (await fetch(schemaUrl(id))).text();
    },
  });

export function APIPage({ page, provider }: { page: GraphQLPageProps; provider: ProviderData }) {
  return (
    <ContentProvider provider={provider}>
      <GraphQLPage {...page} />
    </ContentProvider>
  );
}
