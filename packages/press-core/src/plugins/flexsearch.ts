import type { Index } from 'fumadocs-core/search/flexsearch';
import type { Awaitable, ServerPlugin } from '@/lib/types';
import type { ConfigContext } from '@/config';
import type { AppContext } from '@/lib/shared';

export interface FlexsearchOptions<C extends ConfigContext = ConfigContext> {
  buildIndex?: (this: AppContext<C>, page: C['loaderConfig']['page']) => Awaitable<Index>;
}

export function flexsearchPlugin<C extends ConfigContext = ConfigContext>({
  buildIndex = async function buildIndexDefault(page) {
    for (const adapter of this.adapters) {
      const structuredData = await adapter['core:get-structured-data']?.call(
        this as unknown as AppContext,
        page,
      );

      if (structuredData !== undefined) {
        return {
          id: page.url,
          title: page.data.title ?? page.path,
          description: page.data.description,
          url: page.url,
          structuredData,
        };
      }
    }

    throw new Error('[Fumapress] Please specify the `buildIndex` option to flexsearchPlugin()');
  },
}: FlexsearchOptions<C> = {}): ServerPlugin {
  return {
    async createPages({ createApi }) {
      const { flexsearchFromSource } = await import('fumadocs-core/search/flexsearch');

      createApi({
        render: 'dynamic',
        path: '/api/search',
        handlers: {
          GET: flexsearchFromSource(this.getLoader, {
            buildIndex: buildIndex.bind(this as unknown as AppContext<C>),
          }).GET,
        },
      });
    },
  };
}
