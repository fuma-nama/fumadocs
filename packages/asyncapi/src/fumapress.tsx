import type { AppShape, Plugin } from '@fumapress/core';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { asyncapiTranslations } from '@/i18n';
import type { AsyncAPIPageData, AsyncAPIServer } from '@/server';
import { AsyncAPIPage } from '@/ui/fumapress';
import type { AsyncAPIPageProps } from '@/utils/create-page';
import { renderedDocuments } from '@/utils/document/rendered';

export { AsyncAPIPage };

export interface AsyncAPIPluginOptions {
  /** created with `createAsyncAPI()` */
  server: AsyncAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createAsyncAPIPage()`, for its options. With `includeDocument: false`, `document` is its URL: load it with `loadDocument`.
   *
   * @defaultValue `AsyncAPIPage`
   */
  ClientAPIPage?: ComponentType<AsyncAPIPageProps>;
}

/** documents left out of page props are served at `/api/asyncapi/<id>` */
const documentsPath = '/api/asyncapi';

function isAsyncAPIPage(data: PageData): data is AsyncAPIPageData {
  return 'getAsyncAPIPageProps' in data && typeof data.getAsyncAPIPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()` and serve their documents.
 */
export function asyncapiPlugin<C extends AppShape = AppShape>({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage = AsyncAPIPage,
}: AsyncAPIPluginOptions): Plugin<C> {
  const { includeDocument = true } = server.options;

  return {
    name: 'asyncapi',
    translations: asyncapiTranslations(),
    configureLoader(options) {
      if (disableLoaderPlugin) return options;
      return { ...options, plugins: [...(options.plugins ?? []), server.loaderPlugin()] };
    },
    async routes() {
      if (includeDocument) return;
      return [
        {
          path: `${documentsPath}/[id]`,
          staticPaths: Object.keys(await server.getSchemas()),
          async GET(_, { params: { id } }) {
            const schemas = await server.getSchemas();
            if (typeof id === 'string' && Object.hasOwn(schemas, id))
              return Response.json(schemas[id].bundled);
            return new Response('Not Found', { status: 404 });
          },
        },
      ];
    },
    getPageBody({ data }) {
      if (!isAsyncAPIPage(data)) return;
      const props = data.getAsyncAPIPageProps();
      if (!includeDocument) {
        // keyed by URL, the browser fetches it from there
        props.document = this.withBase(`${documentsPath}/${props.document}`);
        renderedDocuments().set(props.document, data.getSchema().bundled);
      }

      return { node: <ClientAPIPage {...props} /> };
    },
    getPageText({ data }) {
      if (isAsyncAPIPage(data)) return data.getText('processed');
    },
    getPageToc({ data }) {
      if (isAsyncAPIPage(data)) return data.toc;
    },
    getPageStructuredData({ data }) {
      if (isAsyncAPIPage(data)) return data.structuredData;
    },
    transformPage(data, page) {
      return isAsyncAPIPage(page.data) ? { ...data, full: data.full ?? true } : data;
    },
  };
}
