import { type SearchAPI, type SearchServer } from '@/search/server';

export function createEndpoint(server: SearchServer): SearchAPI {
  const { search } = server;

  return {
    search,
    async GET(request) {
      const query = request.nextUrl.searchParams.get('query');
      if (!query) return Response.json([]);

      return Response.json(
        await search(query, {
          tag: request.nextUrl.searchParams.get('tag') ?? undefined,
          locale: request.nextUrl.searchParams.get('locale') ?? undefined,
        }),
      );
    },
  };
}
