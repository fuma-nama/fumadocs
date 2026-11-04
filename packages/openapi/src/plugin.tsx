import type { ApiRoute, Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { openapiTranslations } from '@/i18n';
import type { CreateProxyOptions, OpenAPIPageData, OpenAPIServer, Proxy } from '@/server';
import type { Awaitable } from '@/types';
import { OpenAPIPage, loadDocument } from '@/ui/plugin';
import type { OpenAPIPageProps } from '@/utils/pages/builder';
import { renderedDocuments } from '@/utils/document/rendered';
import { documentsRoute } from 'shared-api/utils/rendered-documents';

export { OpenAPIPage, loadDocument };

export interface OpenAPIPluginOptions {
  /** created with `createOpenAPI()` */
  server: OpenAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createOpenAPIPage()`, for its options. With `includeDocument: false`, `document` is the URL of the document: pass `loadDocument` of this module to `createOpenAPIPage()`.
   *
   * @defaultValue `OpenAPIPage`
   */
  ClientAPIPage?: ComponentType<OpenAPIPageProps>;

  /**
   * Serve the proxy at `proxyUrl` of `createOpenAPI()` on the server: `true`, the options of `server.createProxy()` like `allowedOrigins`, or a function returning your own proxy.
   *
   * Set it to `false` when the proxy is served elsewhere, like a function of your host.
   *
   * @defaultValue `true` when `proxyUrl` is a pathname
   */
  createProxy?: boolean | CreateProxyOptions | (() => Awaitable<Proxy>);
}

/** documents left out of page props are served at `/api/openapi/<id>` */
const documentsPath = '/api/openapi';

function isOpenAPIPage(data: PageData): data is OpenAPIPageData {
  return 'getOpenAPIPageProps' in data && typeof data.getOpenAPIPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()` and serve the routes of its server.
 */
export function openapiPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage = OpenAPIPage,
  createProxy,
}: OpenAPIPluginOptions): Plugin {
  const { proxyUrl, includeDocument = true } = server.options;
  // a pathname of the site, other URLs are proxies elsewhere
  const proxyPath = proxyUrl?.startsWith('/') && !proxyUrl.startsWith('//') ? proxyUrl : undefined;
  const proxy = createProxy ?? proxyPath !== undefined;
  if (proxy && !proxyPath)
    throw new Error(
      '[Fumadocs OpenAPI] `createProxy` of `openapiPlugin()` serves the proxy at `proxyUrl`, set `proxyUrl` of `createOpenAPI()` to a pathname like "/api/proxy".',
    );

  return {
    name: 'openapi',
    translations: openapiTranslations(),
    init() {
      if (proxy && this.mode === 'static')
        throw new Error(
          '[Fumadocs OpenAPI] the proxy of `openapiPlugin()` needs a server, set `createProxy: false` in static mode and serve it elsewhere.',
        );
    },
    configureLoader() {
      if (!disableLoaderPlugin) return { plugins: [server.loaderPlugin()] };
    },
    async apiRoutes() {
      const routes: ApiRoute[] = [];
      if (proxy && proxyPath) {
        const { handle } =
          typeof proxy === 'function'
            ? await proxy()
            : server.createProxy(proxy === true ? {} : proxy);
        routes.push({ path: proxyPath, render: 'dynamic', ALL: handle });
      }
      if (includeDocument) return routes;

      routes.push(
        await documentsRoute({
          path: documentsPath,
          getSchemas: server.getSchemas,
          toResponse: (schema) => Response.json(schema.bundled),
        }),
      );
      return routes;
    },
    getPageBody({ data }) {
      if (!isOpenAPIPage(data)) return;
      const { payload, ...props } = data.getOpenAPIPageProps();
      if (!includeDocument) {
        // keyed by URL, the browser fetches it from there
        props.document = this.withBase(`${documentsPath}/${props.document}`);
        renderedDocuments.set(props.document, data.getSchema().bundled);
      }

      return {
        node: (
          <ClientAPIPage
            {...props}
            payload={{ ...payload, proxyUrl: proxyPath ? this.withBase(proxyPath) : proxyUrl }}
          />
        ),
      };
    },
    getPageText({ data }) {
      if (isOpenAPIPage(data)) return data.description ?? '';
    },
    getPageToc({ data }) {
      if (isOpenAPIPage(data)) return data.toc;
    },
    getPageStructuredData({ data }) {
      if (isOpenAPIPage(data)) return data.structuredData;
    },
    transformPage(data, page) {
      if (isOpenAPIPage(page.data)) return { full: data.full ?? true };
    },
  };
}
