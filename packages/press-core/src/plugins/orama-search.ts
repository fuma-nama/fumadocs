import type { AdvancedIndex } from 'fumadocs-core/search/server';
import type { Awaitable, ServerPlugin } from '@/lib/types';
import type { ConfigContext } from '@/config';
import type { AppContext } from '@/lib/shared';

export interface OramaSearchOptions<C extends ConfigContext = ConfigContext> {
  buildIndex?: (this: AppContext<C>, page: C['loaderConfig']['page']) => Awaitable<AdvancedIndex>;
}

export function oramaSearchPlugin<C extends ConfigContext = ConfigContext>({
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

    throw new Error('[Fumapress] Please specify the `buildIndex` option to oramaSearchPlugin()');
  },
}: OramaSearchOptions<C> = {}): ServerPlugin {
  return {
    init() {
      if (this.mode === 'static') {
        const hooks = (this.data['core:provider'] ??= []);
        hooks.push(async (props) => {
          props.search ??= {};
          props.search.SearchDialog ??= (await import('@/components/orama-search-static')).default;
          return props;
        });
      }
    },
    async createPages({ createApiIsomorphic }) {
      const { createFromSource } = await import('fumadocs-core/search/server');
      const server = createFromSource(this.getLoader, {
        buildIndex: buildIndex.bind(this as unknown as AppContext<C>),
      });

      createApiIsomorphic({
        render: this.mode === 'static' ? 'static' : 'dynamic',
        path: '/api/search',
        handler: this.mode === 'static' ? server.staticGET : server.GET,
      });
    },
  };
}
