import type { SortedResult } from '..';

export interface QueryOptions {
  locale?: string | null;
  tag?: string | string[];
}

export interface SearchServer<Q extends QueryOptions = QueryOptions> {
  search: (query: string, options?: Q) => Promise<SortedResult[]>;

  /**
   * Export the database
   *
   * You can reference the exported database to implement client-side search
   */
  export: () => Promise<unknown>;
}

export interface SearchAPI<Q extends QueryOptions = QueryOptions> extends SearchServer<Q> {
  GET: (request: Request) => Promise<Response>;

  /**
   * `GET` route handler that exports search indexes for static search.
   */
  staticGET: () => Promise<Response>;
}
