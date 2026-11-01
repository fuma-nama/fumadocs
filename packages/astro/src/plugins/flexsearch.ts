import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';
import type { Plugin } from '../app';

/**
 * The search index of FlexSearch, exported at build time and searched in the browser by `useFlexsearchStatic()`, requires `flexsearch`.
 *
 * @param options - options of `flexsearchFromSource()`
 */
export function flexsearchPlugin(options?: Parameters<typeof flexsearchFromSource>[1]): Plugin {
  return {
    name: 'search',
    routes() {
      const server = flexsearchFromSource(this.source, options);
      // the default URL of `useFlexsearchStatic()`
      return [{ type: 'file', url: `${this.base}/api/search`, GET: () => server.staticGET() }];
    },
  };
}
