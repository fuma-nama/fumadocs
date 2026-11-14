import { createFileRoute } from '@tanstack/react-router';
import { docsLlms } from '@/lib/source';

export const Route = createFileRoute('/docs/{$}llms-full.txt')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await docsLlms.serve(new URL(request.url).pathname)) ??
        new Response(null, { status: 404 }),
    },
  },
});
