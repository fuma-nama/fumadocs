import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { graphqlTranslations } from '@/i18n';
import type { GraphQLPageData, GraphQLServer } from '@/server';
import { GraphQLPage } from '@/ui/plugin';
import type { GraphQLPageProps } from '@/utils/create-page';
import { renderedSchemas } from '@/utils/rendered';

export { GraphQLPage };

export interface GraphQLPluginOptions {
  /** created with `createGraphQL()` */
  server: GraphQLServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createGraphQLPage()`, for its options. With `includeSchema: false`, `schema` is its URL: load it with `loadSchema`.
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
    configureLoader(options) {
      if (disableLoaderPlugin) return options;
      return { ...options, plugins: [...(options.plugins ?? []), server.loaderPlugin()] };
    },
    async routes() {
      if (includeSchema) return;
      return [
        {
          path: `${schemasPath}/[id]`,
          staticPaths: Object.keys(await server.getSchemas()),
          async GET(_, { params: { id } }) {
            const schemas = await server.getSchemas();
            if (typeof id === 'string' && Object.hasOwn(schemas, id))
              return new Response(schemas[id].sdl);
            return new Response('Not Found', { status: 404 });
          },
        },
      ];
    },
    getPageBody({ data }) {
      if (!isGraphQLPageData(data)) return;
      const props = data.getGraphQLPageProps();
      if (!includeSchema) {
        // keyed by URL, the browser fetches it from there
        props.schema = this.withBase(`${schemasPath}/${props.schema}`);
        renderedSchemas().set(props.schema, data.getSchema().sdl);
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
      return isGraphQLPageData(page.data) ? { ...data, full: data.full ?? true } : data;
    },
  };
}
