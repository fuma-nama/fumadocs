import type { OpenAPIPageData } from 'fumadocs-openapi/server';
import { openapiTranslations } from 'fumadocs-openapi/i18n';
import type { Plugin } from '../app';
import OpenAPIPage from '../ui/OpenAPIPage.astro';

function isOpenAPI(data: object): data is OpenAPIPageData {
  return 'getOpenAPIPageProps' in data && typeof data.getOpenAPIPageProps === 'function';
}

/**
 * Render the pages of `openapi.staticSource()`, requires `fumadocs-openapi`.
 */
export function openapiPlugin(): Plugin {
  return {
    name: 'openapi',
    translations: openapiTranslations(),
    getBody(page) {
      if (!isOpenAPI(page.data)) return;
      return {
        component: OpenAPIPage,
        props: { page: page.data.getOpenAPIPageProps() },
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
