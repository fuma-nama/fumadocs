import type { APIRoute } from 'astro';
import type { CreateProxyOptions, OpenAPIPageData, OpenAPIServer } from 'fumadocs-openapi/server';
import { openapiTranslations } from 'fumadocs-openapi/i18n';
import type { PageData } from 'fumadocs-core/source';
import type { Plugin, Route } from '../app';
import { isPageDataOf } from '../shared';
import { documentUrl, type BodyProps } from '../ui/openapi';
import OpenAPIPage from '../ui/OpenAPIPage.astro';

export interface OpenAPIPluginOptions {
  /** created with `createOpenAPI()` */
  server: OpenAPIServer;

  /**
   * Serve the proxy at `proxyUrl` of your server, rendered on request with an adapter of Astro: `true`, or the options of `server.createProxy()` like `allowedOrigins`.
   *
   * Set it to `false` when the proxy is served elsewhere, like a function of your host.
   *
   * @defaultValue `true` when `proxyUrl` is a pathname
   */
  createProxy?: boolean | CreateProxyOptions;
}

function isOpenAPIPageData(data: PageData): data is OpenAPIPageData {
  return isPageDataOf<OpenAPIPageData>(data, 'getOpenAPIPageProps');
}

/**
 * Render the pages of `openapi.staticSource()` and serve the routes of its server, requires `fumadocs-openapi`.
 */
export function openapiPlugin({ server, createProxy }: OpenAPIPluginOptions): Plugin {
  const { proxyUrl, includeDocument = true } = server.options;
  // a URL of the site, other URLs are proxies elsewhere
  const isPath = proxyUrl?.startsWith('/') === true;
  const serveProxy = createProxy ?? isPath;
  if (serveProxy && !isPath)
    throw new Error(
      '`createProxy` of `openapiPlugin()` serves the proxy at `proxyUrl`, set `proxyUrl` of `createOpenAPI()` to a pathname like "/api/proxy".',
    );

  return {
    name: 'openapi',
    translations: openapiTranslations(),
    async routes() {
      const routes: Route[] = [];
      if (serveProxy) {
        const { handle } = server.createProxy(serveProxy === true ? {} : serveProxy);
        const handler: APIRoute = ({ request }) => handle(request);
        routes.push({
          type: 'file',
          url: this.base + proxyUrl,
          prerender: false,
          GET: handler,
          POST: handler,
          PUT: handler,
          PATCH: handler,
          DELETE: handler,
        });
      }
      if (includeDocument) return routes;
      for (const [id, { bundled }] of Object.entries(await server.getSchemas()))
        routes.push({ type: 'file', url: documentUrl(id), GET: () => Response.json(bundled) });
      return routes;
    },
    getBody({ data }) {
      if (!isOpenAPIPageData(data)) return;
      const { payload, ...props } = data.getOpenAPIPageProps();
      return {
        component: OpenAPIPage,
        props: {
          page: {
            ...props,
            payload: { ...payload, proxyUrl: isPath ? this.base + proxyUrl : proxyUrl },
          },
          schema: includeDocument ? undefined : data.getSchema(),
        } satisfies BodyProps,
        toc: data.toc,
      };
    },
    getText({ data }) {
      if (isOpenAPIPageData(data)) return data.description ?? '';
    },
    transformPage(page, data) {
      return isOpenAPIPageData(page.data) ? { ...data, full: true } : data;
    },
  };
}
