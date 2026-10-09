import { createFileRoute } from '@tanstack/react-router';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { source } from '@/lib/source';
import { appName } from '@/lib/shared';

export const Route = createFileRoute('/og/docs/$')({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slugs = (params._splat?.split('/') ?? []).filter((v) => v.length > 0).slice(0, -1);
        const page = source.getPage(slugs);
        if (!page) return new Response(undefined, { status: 404 });

        return generateOGImage({
          title: page.data.title,
          description: page.data.description,
          site: appName,
          format: 'webp',
        });
      },
    },
  },
});
