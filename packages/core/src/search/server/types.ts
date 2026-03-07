import type { SortedResult } from '..';

export interface SearchServer {
  search: (
    query: string,
    options?: {
      locale?: string;
      tag?: string | string[];
      mode?: 'vector' | 'full';
    },
  ) => Promise<SortedResult[]>;

  /**
   * Export the database
   *
   * You can reference the exported database to implement client-side search
   */
  export: () => Promise<unknown>;
}

export interface SearchAPI extends SearchServer {
  GET: (request: Request) => Promise<Response>;

  /**
   * `GET` route handler that exports search indexes for static search.
   */
  staticGET: () => Promise<Response>;
}
