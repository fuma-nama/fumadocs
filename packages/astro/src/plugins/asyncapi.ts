import type { AsyncAPIPageData, AsyncAPIServer } from '@fumadocs/asyncapi/server';
import { asyncapiTranslations } from '@fumadocs/asyncapi/i18n';
import type { Plugin, Route } from '../app';
import { isPageDataOf } from '../shared';
import { documentUrl } from '../ui/asyncapi';
import AsyncAPIPage from '../ui/AsyncAPIPage.astro';

export interface AsyncAPIPluginOptions {
  /** created with `createAsyncAPI()` */
  server: AsyncAPIServer;
}

const isAsyncAPI = (data: object): data is AsyncAPIPageData =>
  isPageDataOf<AsyncAPIPageData>(data, 'getAsyncAPIPageProps');

/**
 * Render the pages of `asyncapi.staticSource()` and serve their documents, requires `@fumadocs/asyncapi`.
 */
export function asyncapiPlugin({ server }: AsyncAPIPluginOptions): Plugin {
  const { includeDocument = true } = server.options;

  return {
    name: 'asyncapi',
    translations: asyncapiTranslations(),
    async routes() {
      const routes: Route[] = [];
      if (includeDocument) return routes;
      for (const [id, { bundled }] of Object.entries(await server.getSchemas())) {
        routes.push({
          type: 'file',
          url: documentUrl(id),
          GET: () => Response.json(bundled),
        });
      }
      return routes;
    },
    getBody(page) {
      if (!isAsyncAPI(page.data)) return;
      return {
        component: AsyncAPIPage,
        props: {
          page: page.data.getAsyncAPIPageProps(),
          schema: includeDocument ? undefined : page.data.getSchema(),
        },
        toc: page.data.toc,
      };
    },
    transformPage(page, data) {
      return isAsyncAPI(page.data) ? { ...data, full: true } : data;
    },
  };
}
