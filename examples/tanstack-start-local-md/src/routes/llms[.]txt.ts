import { getDocsLlms } from '@/lib/source';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      async GET() {
        const docsLlms = await getDocsLlms();
        return new Response(docsLlms.index());
      },
    },
  },
});
