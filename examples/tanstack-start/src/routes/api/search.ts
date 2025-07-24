import { createServerFileRoute } from '@tanstack/react-start/server';
import { source } from '~/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const server = createFromSource(source);

export const ServerRoute = createServerFileRoute('/api/search').methods({
  GET: async ({ request }) => server.GET(request),
});
