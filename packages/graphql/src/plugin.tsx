import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { graphqlTranslations } from '@/i18n';
import type { GraphQLPageData, GraphQLServer } from '@/server';
import { GraphQLPage, loadSchema } from '@/ui/plugin';
import type { GraphQLPageProps } from '@/utils/create-page';
import { renderedSchemas } from '@/utils/rendered';
import { documentsRoute } from 'shared-api/utils/rendered-documents';

export { GraphQLPage, loadSchema };

export interface GraphQLPluginOptions {
  /** created with `createGraphQL()` */
  server: GraphQLServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createGraphQLPage()`, for its options. With `includeSchema: false`, `schema` is its URL: pass `loadSchema` of this module to `createGraphQLPage()`.
   *
   * @defaultValue `GraphQLPage`
   */
  ClientAPIPage?: ComponentType<GraphQLPageProps>;
}

/** schemas left out of page props are served at `/api/graphql-schema/<id>` */
const schemasPath = '/api/graphql-schema';

function isGraphQLPageData(data: PageData): data is GraphQLPageData {
  return 'getGraphQLPageProps' in data && typeof data.getGraphQLPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()` and `server.dynamicSource()`, and serve their schemas.
 */
export function graphqlPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage = GraphQLPage,
}: GraphQLPluginOptions): Plugin {
  const { includeSchema = true } = server.options;

  return {
    name: 'graphql',
    translations: graphqlTranslations(),
    configureLoader() {
      if (!disableLoaderPlugin) return { plugins: [server.loaderPlugin()] };
    },
    async apiRoutes() {
      if (includeSchema) return;
      return [
        await documentsRoute({
          path: schemasPath,
          getSchemas: server.getSchemas,
          toResponse: (schema) => new Response(schema.sdl),
        }),
      ];
    },
    getPageBody({ data }) {
      if (!isGraphQLPageData(data)) return;
      const props = data.getGraphQLPageProps();
      if (!includeSchema) {
        // keyed by URL, the browser fetches it from there
        props.schema = this.withBase(`${schemasPath}/${props.schema}`);
        renderedSchemas.set(props.schema, data.getSchema().sdl);
      }

      return { node: <ClientAPIPage {...props} /> };
    },
    getPageText({ data }) {
      if (isGraphQLPageData(data)) return data.getText('processed');
    },
    getPageToc({ data }) {
      if (isGraphQLPageData(data)) return data.toc;
    },
    getPageStructuredData({ data }) {
      if (isGraphQLPageData(data)) return data.structuredData;
    },
    transformPage(data, page) {
      if (isGraphQLPageData(page.data)) return { full: data.full ?? true };
    },
  };
}
