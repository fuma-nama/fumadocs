import { createServerFileRoute } from '@tanstack/react-start/server';
import { createSearchAPI } from 'fumadocs-core/search/server';
import { source } from '~/lib/source';
import { structure } from 'fumadocs-core/mdx-plugins';

const server = createSearchAPI('advanced', {
  indexes: source.getPages().map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title!,
    structuredData: structure(page.data.content),
  })),
});

export const ServerRoute = createServerFileRoute('/api/search').methods({
  GET: async ({ request }) => server.GET(request),
});
