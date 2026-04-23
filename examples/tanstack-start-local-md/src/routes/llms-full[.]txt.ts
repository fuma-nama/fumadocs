import { createFileRoute } from '@tanstack/react-router';
import { getLLMText, getSource } from '@/lib/source';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const source = await getSource();
        const scan = source.getPages().map(getLLMText);
        const scanned = await Promise.all(scan);
        return new Response(scanned.join('\n\n'));
      },
    },
  },
});
