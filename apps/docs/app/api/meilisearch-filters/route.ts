import { NextResponse } from 'next/server';
import { fetchFilters } from 'fumadocs-core/search/meilisearch';
import { meiliClient, MEILISEARCH_INDEX } from '@/lib/meilisearch/meilisearch';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filterAttribute = url.searchParams.get('filterAttribute') ?? undefined;

    const filters = await fetchFilters({
      indexUid: MEILISEARCH_INDEX,
      client: meiliClient,
      filterAttribute: filterAttribute,
    });

    return NextResponse.json(filters);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
