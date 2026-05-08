import type { AdvancedIndex } from 'fumadocs-core/search/server';
import type { ServerPlugin } from '.';
import type { Awaitable } from '@/lib/types';
import type { ConfigContext } from '@/config';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { AppContext } from '@/lib/shared';

export interface OramaSearchOptions<C extends ConfigContext = ConfigContext> {
  buildIndex?: (this: AppContext<C>, page: C['loaderConfig']['page']) => Awaitable<AdvancedIndex>;
}

export function oramaSearchPlugin<C extends ConfigContext = ConfigContext>({
  buildIndex = async function buildIndexDefault(page) {
    let structuredData: StructuredData | undefined;

    for (const adapter of this.adapters) {
      structuredData = await adapter['core:get-structured-data']?.call(
        this as unknown as AppContext,
        page,
      );
      if (structuredData !== undefined) break;
    }

    if (structuredData === undefined)
      throw new Error('[Fumapress] Please specify the `buildIndex` option to oramaSearchPlugin()');

    return {
      id: page.url,
      title: page.data.title ?? page.path,
      description: page.data.description,
      url: page.url,
      structuredData,
    };
  },
}: OramaSearchOptions<C> = {}): ServerPlugin {
  return {
    async createPages({ createApi }) {
      const { createFromSource } = await import('fumadocs-core/search/server');

      createApi({
        render: 'dynamic',
        path: '/api/search',
        handlers: {
          GET: createFromSource(this.getLoader, {
            buildIndex: buildIndex.bind(this as unknown as AppContext<C>),
          }).GET,
        },
      });
    },
  };
}
