import type { ApiRoute, AppShape, Awaitable, Plugin } from '@fumapress/core';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { openapiTranslations } from '@/i18n';
import type { CreateProxyOptions, OpenAPIPageData, OpenAPIServer, Proxy } from '@/server';
import { OpenAPIPage } from '@/ui/fumapress';
import type { OpenAPIPageProps } from '@/utils/pages/builder';
import { renderedDocuments } from '@/utils/document/rendered';

export { OpenAPIPage };

export interface OpenAPIPluginOptions {
  /** created with `createOpenAPI()` */
  server: OpenAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createOpenAPIPage()`, for its options. With `includeDocument: false`, `document` is the URL of the document: load it with `loadDocument`.
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
export function openapiPlugin<C extends AppShape = AppShape>({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage = OpenAPIPage,
  createProxy,
}: OpenAPIPluginOptions): Plugin<C> {
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
    configureLoader(options) {
      if (disableLoaderPlugin) return options;
      return { ...options, plugins: [...(options.plugins ?? []), server.loaderPlugin()] };
    },
    async routes() {
      const routes: ApiRoute[] = [];
      if (proxy && proxyPath) {
        const { handle } =
          typeof proxy === 'function'
            ? await proxy()
            : server.createProxy(proxy === true ? {} : proxy);
        routes.push({ path: proxyPath, render: 'dynamic', ALL: handle });
      }
      if (includeDocument) return routes;

      routes.push({
        path: `${documentsPath}/[id]`,
        staticPaths: Object.keys(await server.getSchemas()),
        async GET(_, { params: { id } }) {
          const schemas = await server.getSchemas();
          if (typeof id === 'string' && Object.hasOwn(schemas, id))
            return Response.json(schemas[id].bundled);
          return new Response('Not Found', { status: 404 });
        },
      });
      return routes;
    },
    getPageBody({ data }) {
      if (!isOpenAPIPage(data)) return;
      const { payload, ...props } = data.getOpenAPIPageProps();
      if (!includeDocument) {
        // keyed by URL, the browser fetches it from there
        props.document = this.withBase(`${documentsPath}/${props.document}`);
        renderedDocuments().set(props.document, data.getSchema().bundled);
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
    getPageToc({ data }) {
      if (isOpenAPIPage(data)) return data.toc;
    },
    getPageStructuredData({ data }) {
      if (isOpenAPIPage(data)) return data.structuredData;
    },
    transformPage(data, page) {
      return isOpenAPIPage(page.data) ? { ...data, full: data.full ?? true } : data;
    },
  };
}
