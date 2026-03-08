import type { QueryOptions, SearchAPI, SearchServer } from './types';

export interface EndpointOptions<Q extends QueryOptions> {
  readOptions?: (url: URL, request: Request) => Q;
}

export function createEndpoint<Q extends QueryOptions>(
  server: SearchServer<Q>,
  options: EndpointOptions<NoInfer<Q>> = {},
): SearchAPI<Q> {
  const { search } = server;
  const {
    readOptions = (url) => {
      return {
        tag: url.searchParams.get('tag')?.split(','),
        locale: url.searchParams.get('locale'),
      } as Q;
    },
  } = options;

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
