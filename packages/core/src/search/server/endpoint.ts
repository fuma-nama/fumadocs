import type { QueryOptions, SearchAPI, SearchServer } from './types';

export interface EndpointOptions<Q extends QueryOptions> {
  readOptions?: (url: URL, request: Request) => Q;
}

export function createEndpoint<Q extends QueryOptions>(
  server: SearchServer<Q>,
  options: EndpointOptions<NoInfer<Q>> = {},
): SearchAPI<Q> {
  const { search } = server;
  const { readOptions = defaultReadOptions } = options;

  return {
    ...server,
    async staticGET() {
      return Response.json(await server.export());
    },
    async GET(request) {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      if (!query) return Response.json([]);

      return Response.json(await search(query, readOptions(url, request)));
    },
  };
}

export function defaultReadOptions<Q extends QueryOptions>(url: URL): Q {
  const params = url.searchParams;
  const limit = params.has('limit') ? Number(params.get('limit')) : undefined;

  return {
    tag: params.get('tag')?.split(','),
    locale: params.get('locale'),
    limit: Number.isInteger(limit) ? limit : undefined,
  } as Q;
}
