import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { ComponentType } from 'react';
import { asyncapiTranslations } from '@/i18n';
import type { AsyncAPIPageData, AsyncAPIServer } from '@/server';
import { AsyncAPIPage } from '@/ui/press';
import type { AsyncAPIPageProps } from '@/utils/create-page';

export interface AsyncAPIPluginOptions {
  /** created with `createAsyncAPI()` */
  server: AsyncAPIServer;

  /** leave `server.loaderPlugin()` out of the content loader */
  disableLoaderPlugin?: boolean;

  /**
   * A client component created with `createAsyncAPIPage()`, for its options. Required with `includeDocument: false`: pass `loadDocument` to `createAsyncAPIPage()`.
   *
   * @defaultValue `createAsyncAPIPage()`
   */
  ClientAPIPage?: ComponentType<AsyncAPIPageProps>;
}

function isAsyncAPIPage(data: PageData): data is AsyncAPIPageData {
  return 'getAsyncAPIPageProps' in data && typeof data.getAsyncAPIPageProps === 'function';
}

/**
 * Render the pages of `server.staticSource()`.
 */
export default function asyncapiPlugin({
  server,
  disableLoaderPlugin = false,
  ClientAPIPage,
}: AsyncAPIPluginOptions): Plugin {
  const { includeDocument = true } = server.options;
  if (!includeDocument && !ClientAPIPage)
    throw new Error(
      '[Fumadocs AsyncAPI] `includeDocument: false` leaves documents out of page props, pass a `ClientAPIPage` made with `createAsyncAPIPage({ loadDocument })` to `asyncapiPlugin()`.',
    );
  const Page = ClientAPIPage ?? AsyncAPIPage;

  return {
    name: 'asyncapi',
    translations: asyncapiTranslations(),
    configureLoader() {
      if (!disableLoaderPlugin) return { plugins: [server.loaderPlugin()] };
    },
    getPageBody({ data }) {
      if (!isAsyncAPIPage(data)) return;
      return { node: <Page {...data.getAsyncAPIPageProps()} /> };
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
