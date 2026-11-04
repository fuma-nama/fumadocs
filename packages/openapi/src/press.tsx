import type { ApiRoute, Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { openapiTranslations } from '@/i18n';
import type { CreateProxyOptions, OpenAPIPageData, OpenAPIServer, Proxy } from '@/server';
import type { Awaitable } from '@/types';
import { OpenAPIPage } from '@/ui/press';
import type { OpenAPIPageProps } from '@/utils/pages/builder';

export interface OpenAPIPluginOptions {
  /** created with `createOpenAPI()` */
  server: OpenAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createOpenAPIPage()`, for its options. Required with `includeDocument: false`: pass `loadDocument` to `createOpenAPIPage()`.
   *
   * @defaultValue `createOpenAPIPage()`
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

function isOpenAPIPage(data: PageData): data is OpenAPIPageData {
  return 'getOpenAPIPageProps' in data && typeof data.getOpenAPIPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()` and serve the routes of its server.
 */
export default function openapiPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage,
  createProxy,
}: OpenAPIPluginOptions): Plugin {
  const { proxyUrl, includeDocument = true } = server.options;
  if (!includeDocument && !ClientAPIPage)
    throw new Error(
      '[Fumadocs OpenAPI] `includeDocument: false` leaves documents out of page props, pass a `ClientAPIPage` made with `createOpenAPIPage({ loadDocument })` to `openapiPlugin()`.',
    );
  const Page = ClientAPIPage ?? OpenAPIPage;
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
      return routes;
    },
    getPageBody({ data }) {
      if (!isOpenAPIPage(data)) return;
      const { payload, ...props } = data.getOpenAPIPageProps();

      return {
        node: (
          <Page
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
