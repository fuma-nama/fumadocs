import type Mixedbread from '@mixedbread/sdk';
import type { SearchClient } from '../client';
import { createMixedbreadSearchAPI } from '../mixedbread';

export type { SearchMetadata } from '../mixedbread';

export interface MixedbreadOptions {
  /**
   * The identifier of the store to search in
   */
  storeIdentifier: string;

  /**
   * The Mixedbread SDK client instance
   */
  client: Mixedbread;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  /**
   * Filter by locale (unsupported at the moment)
   */
  locale?: string;
}

/**
 * @deprecated Use `createMixedbreadSearchAPI` from `fumadocs-core/search/mixedbread` instead.
 * This client-side approach exposes your API key in the browser.
 * The server-side approach keeps the key secure and uses `useFetchSearch()` on the client.
 */
export function mixedbreadClient(options: MixedbreadOptions): SearchClient {
  const { client, storeIdentifier, tag } = options;
  const api = createMixedbreadSearchAPI({ client, storeIdentifier });

  return {
    deps: [client, storeIdentifier, tag],
    search: (query) => api.search(query, { tag }),
  };
}
