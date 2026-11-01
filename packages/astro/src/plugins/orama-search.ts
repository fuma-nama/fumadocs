import { createFromSource } from 'fumadocs-core/search/server';
import type { Plugin } from '../app';

/** options of `createFromSource()`, which `fumadocs-core` doesn't export */
export type OramaSearchOptions = NonNullable<Parameters<typeof createFromSource>[1]>;

/**
 * The built-in search index of Orama, exported at build time and searched in the browser by `useStaticSearch()`.
 *
 * @param options - options of `createFromSource()`
 */
export function oramaSearchPlugin(options?: OramaSearchOptions): Plugin {
  return {
    name: 'search',
    routes() {
      const server = createFromSource(this.source, options);
      // the default URL of `useStaticSearch()`
      return [{ type: 'file', url: `${this.base}/api/search`, GET: () => server.staticGET() }];
    },
  };
}
