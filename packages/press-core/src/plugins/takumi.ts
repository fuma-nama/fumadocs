import type { ServerPlugin } from '@/lib/types';
import { unstable_notFound } from 'waku/router/server';
import type { GenerateProps } from 'fumadocs-ui/og/takumi';
import { createElement } from 'react';

export function takumiPlugin(options: Partial<GenerateProps> = {}): ServerPlugin {
  return {
    init() {
      const hooks = (this.data['core:page-meta'] ??= []);
      hooks.push((page) => {
        return createElement('meta', {
          property: 'og:image',
          content: slugsToImagePath(page.slugs).url,
        });
      });
    },
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

          const page = source.getPage(imagePathToSlugs(params.slugs as string[]));
          if (!page) unstable_notFound();

          return new ImageResponse(
            generate({
              title: page.data.title,
              description: page.data.description,
              site: this.config.site.name,
              ...options,
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

function slugsToImagePath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.webp');
  } else {
    segments[segments.length - 1] += '.webp';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

function imagePathToSlugs(segs: string[]) {
  const slugs = [...segs];
  if (slugs.length === 0) return slugs;

  slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.webp$/, '');
  if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

  return slugs;
}
