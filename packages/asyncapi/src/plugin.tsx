import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { asyncapiTranslations } from '@/i18n';
import type { AsyncAPIPageData, AsyncAPIServer } from '@/server';
import { AsyncAPIPage, loadDocument } from '@/ui/plugin';
import type { AsyncAPIPageProps } from '@/utils/create-page';
import { renderedDocuments } from '@/utils/document/rendered';
import { documentsRoute } from 'shared-api/utils/rendered-documents';

export { AsyncAPIPage, loadDocument };

export interface AsyncAPIPluginOptions {
  /** created with `createAsyncAPI()` */
  server: AsyncAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createAsyncAPIPage()`, for its options. With `includeDocument: false`, `document` is its URL: pass `loadDocument` of this module to `createAsyncAPIPage()`.
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
export function asyncapiPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage = AsyncAPIPage,
}: AsyncAPIPluginOptions): Plugin {
  const { includeDocument = true } = server.options;

  return {
    name: 'asyncapi',
    translations: asyncapiTranslations(),
    configureLoader() {
      if (!disableLoaderPlugin) return { plugins: [server.loaderPlugin()] };
    },
    async apiRoutes() {
      if (includeDocument) return;
      return [
        await documentsRoute({
          path: documentsPath,
          getSchemas: server.getSchemas,
          toResponse: (schema) => Response.json(schema.bundled),
        }),
      ];
    },
    getPageBody({ data }) {
      if (!isAsyncAPIPage(data)) return;
      const props = data.getAsyncAPIPageProps();
      if (!includeDocument) {
        // keyed by URL, the browser fetches it from there
        props.document = this.withBase(`${documentsPath}/${props.document}`);
        renderedDocuments.set(props.document, data.getSchema().bundled);
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
      if (isAsyncAPIPage(page.data)) return { full: data.full ?? true };
    },
  };
}
