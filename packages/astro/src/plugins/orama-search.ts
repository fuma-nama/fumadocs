import { createFromSource } from 'fumadocs-core/search/server';
import type { Plugin } from '../app';

/**
 * The built-in search index of Orama, exported at build time and searched in the browser by `useStaticSearch()`.
 *
 * @param options - options of `createFromSource()`
 */
export function oramaSearchPlugin(options?: Parameters<typeof createFromSource>[1]): Plugin {
  return {
    name: 'search',
    routes() {
      const server = createFromSource(this.source, options);
      // the default URL of `useStaticSearch()`
      return [{ type: 'file', url: `${this.base}/api/search`, GET: () => server.staticGET() }];
    },
  };
}
