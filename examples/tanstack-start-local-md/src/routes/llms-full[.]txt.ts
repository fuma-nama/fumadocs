import { createFileRoute } from '@tanstack/react-router';
import { getDocsLlms } from '@/lib/source';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const docsLlms = await getDocsLlms();
        return new Response(await docsLlms.full());
      },
    },
  },
});
