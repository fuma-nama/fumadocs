import { createFileRoute, notFound } from '@tanstack/react-router';
import { getLLMText, getSource } from '@/lib/source';

export const Route = createFileRoute('/llms.mdx/docs/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        slugs.pop();
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
