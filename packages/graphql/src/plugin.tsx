import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { graphqlTranslations } from '@/i18n';
import type { GraphQLPageData, GraphQLServer } from '@/server';
import { GraphQLPage } from '@/ui/plugin';
import type { GraphQLPageProps } from '@/utils/create-page';

export interface GraphQLPluginOptions {
  /** created with `createGraphQL()` */
  server: GraphQLServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createGraphQLPage()`, for its options. Required with `includeSchema: false`: pass `loadSchema` to `createGraphQLPage()`.
   *
   * @defaultValue `createGraphQLPage()`
   */
  ClientAPIPage?: ComponentType<GraphQLPageProps>;
}

function isGraphQLPageData(data: PageData): data is GraphQLPageData {
  return 'getGraphQLPageProps' in data && typeof data.getGraphQLPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()` and `server.dynamicSource()`.
 */
export function graphqlPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage,
}: GraphQLPluginOptions): Plugin {
  const { includeSchema = true } = server.options;
  if (!includeSchema && !ClientAPIPage)
    throw new Error(
      '[Fumadocs GraphQL] `includeSchema: false` leaves schemas out of page props, pass a `ClientAPIPage` made with `createGraphQLPage({ loadSchema })` to `graphqlPlugin()`.',
    );
  const Page = ClientAPIPage ?? GraphQLPage;

  return {
    name: 'graphql',
    translations: graphqlTranslations(),
    configureLoader() {
      if (!disableLoaderPlugin) return { plugins: [server.loaderPlugin()] };
    },
    getPageBody({ data }) {
      if (!isGraphQLPageData(data)) return;
      return { node: <Page {...data.getGraphQLPageProps()} /> };
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
