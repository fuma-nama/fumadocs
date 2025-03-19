import { type SearchAPI, type SearchServer } from '@/search/server';

export function createEndpoint(server: SearchServer): SearchAPI {
  const { search } = server;

  return {
    ...server,
    async staticGET() {
      return Response.json(await server.export());
    },
    async GET(request) {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      if (!query) return Response.json([]);

      return Response.json(
        await search(query, {
          tag: url.searchParams.get('tag') ?? undefined,
          locale: url.searchParams.get('locale') ?? undefined,
        }),
      );
    },
  };
}
