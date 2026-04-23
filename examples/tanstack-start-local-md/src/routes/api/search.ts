import { createFileRoute } from '@tanstack/react-router';
import { getSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const server = createFromSource(getSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
});
