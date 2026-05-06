import { slugsToImagePath } from '@/lib/source';
import { ServerPlugin } from '.';
import { unstable_notFound } from 'waku/router/server';

export function takumiPlugin(): ServerPlugin {
  return {
    async createPages({ createApi }) {
      createApi({
        render: 'static',
        path: '/[...slugs]',
        method: 'GET',
        staticPaths: (await this.getLoader())
          .getPages()
          .map((page) => slugsToImagePath(page.slugs).segments),
        handler: async (_, { params }) => {
          const source = await this.getLoader();
          const { ImageResponse } = await import('@takumi-rs/image-response');
          const { generate } = await import('fumadocs-ui/og/takumi');

          const slugs = [...(params.slugs as string[])];
          if (slugs.length === 0) unstable_notFound();

          slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.webp$/, '');
          if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

          const page = source.getPage(slugs);
          if (!page) unstable_notFound();

          return new ImageResponse(
            generate({
              title: page.data.title,
              description: page.data.description,
              site: this.config.site.name,
            }),
            {
              width: 1200,
              height: 630,
              format: 'webp',
            },
          );
        },
      });
    },
  };
}
