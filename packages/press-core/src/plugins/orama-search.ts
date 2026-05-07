import type { AdvancedIndex } from 'fumadocs-core/search/server';
import type { ServerPlugin } from '.';
import type { Awaitable } from '@/lib/types';
import type { ConfigContext } from '@/config';

export interface OramaSearchOptions<C extends ConfigContext = ConfigContext> {
  buildIndex?: (page: C['loaderConfig']['page']) => Awaitable<AdvancedIndex>;
}

export function oramaSearchPlugin<C extends ConfigContext = ConfigContext>(
  options: OramaSearchOptions<C> = {},
): ServerPlugin {
  return {
    async createPages({ createApi }) {
      const { createFromSource } = await import('fumadocs-core/search/server');

      createApi({
        render: 'dynamic',
        path: '/api/search',
        handlers: {
          GET: createFromSource(this.getLoader, options).GET,
        },
      });
    },
  };
}
