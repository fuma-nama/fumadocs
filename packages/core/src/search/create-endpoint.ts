import { NextResponse } from 'next/server';
import { type SearchAPI } from '@/search/server';

export function createEndpoint(search: SearchAPI['search']): SearchAPI {
  return {
    search,
    async GET(request) {
      const query = request.nextUrl.searchParams.get('query');
      if (!query) return NextResponse.json([]);

      return NextResponse.json(
        await search(query, {
          tag: request.nextUrl.searchParams.get('tag') ?? undefined,
          locale: request.nextUrl.searchParams.get('locale') ?? undefined,
        }),
      );
    },
  };
}
