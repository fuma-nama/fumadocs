import { createFileRoute, notFound } from '@tanstack/react-router';
import { getLLMText, getSource, markdownPathToSlugs } from '@/lib/source';

export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split('/') ?? []);
        const source = await getSource();
        const page = source.getPage(slugs);
        if (!page) throw notFound();

        return new Response(await getLLMText(page), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      },
    },
  },
});
