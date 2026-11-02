import {
  createFromSource,
  type AdvancedIndex,
  type AdvancedOptions,
} from 'fumadocs-core/search/server';
import type { Context } from '../context';
import type { AppShape, Awaitable, Plugin } from '../plugin';
import { buildIndexDefault, searchRoute } from '../search';

export interface OramaSearchOptions<C extends AppShape = AppShape> extends Omit<
  AdvancedOptions,
  'indexes'
> {
  /** the search index of a page, from `getPageStructuredData()` by default */
  buildIndex?: (this: Context<C>, page: C['page']) => Awaitable<AdvancedIndex>;
}

/**
 * Search with the built-in Orama engine at `/api/search`.
 *
 * In `static` mode, it exports the index for search in the browser, the other modes search on the server.
 */
export function oramaSearchPlugin<C extends AppShape = AppShape>({
  buildIndex = buildIndexDefault,
  ...options
}: OramaSearchOptions<NoInfer<C>> = {}): Plugin<C> {
  return {
    name: 'orama-search',
    provides: ['search'],
    routes() {
      const server = createFromSource(() => this.getLoader(), {
        ...options,
        buildIndex: (page) => buildIndex.call(this, page),
      });
      return [searchRoute(this.mode, server)];
    },
  };
}
