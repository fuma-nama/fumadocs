import type { GraphQLPageData, GraphQLServer } from '@fumadocs/graphql/server';
import { graphqlTranslations } from '@fumadocs/graphql/i18n';
import type { Plugin, Route } from '../app';
import { schemaUrl } from '../ui/graphql';
import GraphQLPage from '../ui/GraphQLPage.astro';

export interface GraphQLPluginOptions {
  /** created with `createGraphQL()` */
  server: GraphQLServer;
}

function isGraphQL(data: object): data is GraphQLPageData {
  return 'getGraphQLPageProps' in data && typeof data.getGraphQLPageProps === 'function';
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
      for (const [id, { sdl }] of Object.entries(await server.getSchemas())) {
        routes.push({ type: 'file', url: schemaUrl(id), GET: () => new Response(sdl) });
      }
      return routes;
    },
    getBody(page) {
      if (!isGraphQL(page.data)) return;
      return {
        component: GraphQLPage,
        props: {
          page: page.data.getGraphQLPageProps(),
          schema: includeSchema ? undefined : page.data.getSchema(),
        },
        toc: page.data.toc,
      };
    },
    transformPage(page, data) {
      return isGraphQL(page.data) ? { ...data, full: true } : data;
    },
  };
}
