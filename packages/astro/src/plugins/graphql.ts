import type { GraphQLPageData, GraphQLServer } from '@fumadocs/graphql/server';
import { graphqlTranslations } from '@fumadocs/graphql/i18n';
import type { PageData } from 'fumadocs-core/source';
import type { Plugin, Route } from '../app';
import { isPageDataOf } from '../shared';
import { schemaUrl, type BodyProps } from '../ui/graphql';
import GraphQLPage from '../ui/GraphQLPage.astro';

export interface GraphQLPluginOptions {
  /** created with `createGraphQL()` */
  server: GraphQLServer;
}

function isGraphQLPageData(data: PageData): data is GraphQLPageData {
  return isPageDataOf<GraphQLPageData>(data, 'getGraphQLPageProps');
}

/**
 * Render the pages of `graphql.staticSource()` and serve their schemas, requires `@fumadocs/graphql`.
 */
export function graphqlPlugin({ server }: GraphQLPluginOptions): Plugin {
  const { includeSchema = true } = server.options;

  return {
    name: 'graphql',
    translations: graphqlTranslations(),
    async routes() {
      const routes: Route[] = [];
      if (includeSchema) return routes;
      for (const [id, { sdl }] of Object.entries(await server.getSchemas()))
        routes.push({ type: 'file', url: schemaUrl(id), GET: () => new Response(sdl) });
      return routes;
    },
    getBody({ data }) {
      if (!isGraphQLPageData(data)) return;
      return {
        component: GraphQLPage,
        props: {
          page: data.getGraphQLPageProps(),
          schema: includeSchema ? undefined : data.getSchema(),
        } satisfies BodyProps,
        toc: data.toc,
      };
    },
    transformPage(page, data) {
      return isGraphQLPageData(page.data) ? { ...data, full: true } : data;
    },
  };
}
