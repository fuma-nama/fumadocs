import { createFileRoute, notFound } from '@tanstack/react-router';
import { source } from '@/lib/source';

export const Route = createFileRoute('/llms.mdx/docs/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = (params._splat ?? '').split('/');
        // remove the appended "index.mdx" to avoid build issues
        slugs.pop();
        const page = source.getPage(slugs);
        if (!page) throw notFound();

        return new Response(await page.data.getText('processed'), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      },
    },
  },
});
