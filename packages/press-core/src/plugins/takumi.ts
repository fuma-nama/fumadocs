import type { ServerPlugin } from '.';
import { unstable_notFound } from 'waku/router/server';
import type { GenerateProps } from 'fumadocs-ui/og/takumi';
import { createElement, Fragment } from 'react';

export function takumiPlugin(options: Partial<GenerateProps> = {}): ServerPlugin {
  return {
    init() {
      this.data['core:docs-layout'] ??= {};
      this.data['core:docs-layout'].renderers ??= [];
      this.data['core:docs-layout'].renderers.push(function (res) {
        res.body = createElement(
          Fragment,
          null,
          res.body,
          createElement('meta', {
            property: 'og:image',
            content: slugsToImagePath(this.page.slugs),
          }),
        );
        return res;
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
