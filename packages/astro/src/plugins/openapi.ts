import type { OpenAPIPageData, OpenAPIServer } from 'fumadocs-openapi/server';
import { openapiTranslations } from 'fumadocs-openapi/i18n';
import type { Plugin, Route, RouteHandler } from '../app';
import { isPageDataOf } from '../shared';
import { documentUrl } from '../ui/openapi';
import OpenAPIPage from '../ui/OpenAPIPage.astro';

export interface OpenAPIPluginOptions {
  /** created with `createOpenAPI()` */
  server: OpenAPIServer;
}

const isOpenAPI = (data: object): data is OpenAPIPageData =>
  isPageDataOf<OpenAPIPageData>(data, 'getOpenAPIPageProps');

/**
 * Render the pages of `openapi.staticSource()` and serve the routes of its server, requires `fumadocs-openapi`.
 */
export function openapiPlugin({ server }: OpenAPIPluginOptions): Plugin {
  const { proxyUrl, includeDocument = true } = server.options;
  // a URL of the site, other URLs are proxies elsewhere
  const serveProxy = proxyUrl?.startsWith('/') === true;

  return {
    name: 'openapi',
    translations: openapiTranslations(),
    async routes() {
      const routes: Route[] = [];
      if (serveProxy) {
        const { handle } = server.createProxy();
        const handler: RouteHandler = ({ request }) => handle(request);
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
      if (!includeDocument) {
        for (const [id, { bundled }] of Object.entries(await server.getSchemas())) {
          routes.push({ type: 'file', url: documentUrl(id), GET: () => Response.json(bundled) });
        }
      }
      return routes;
    },
    getBody(page) {
      if (!isOpenAPI(page.data)) return;
      const { payload, ...props } = page.data.getOpenAPIPageProps();
      return {
        component: OpenAPIPage,
        props: {
          page: {
            ...props,
            payload: { ...payload, proxyUrl: serveProxy ? this.base + proxyUrl : proxyUrl },
          },
          schema: includeDocument ? undefined : page.data.getSchema(),
        },
        toc: page.data.toc,
      };
    },
    getText(page) {
      if (isOpenAPI(page.data)) return page.data.description ?? '';
    },
    transformPage(page, data) {
      return isOpenAPI(page.data) ? { ...data, full: true } : data;
    },
  };
}
