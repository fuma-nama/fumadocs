import { createFileRoute } from '@tanstack/react-router';
import { llms } from 'fumadocs-core/source';
import { source } from '@/lib/source';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET() {
        return new Response(llms(source).index());
      },
    },
  },
});
