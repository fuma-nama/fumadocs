import * as waku from 'waku';
import { getLLMText, getPageImage, getPageMarkdownUrl, getSource } from './lib/source';
import { llms } from 'fumadocs-core/source/llms';
import { unstable_notFound } from 'waku/router/server';
import { appName } from './lib/shared';
import { createFromSource } from 'fumadocs-core/search/server';
import type { FC, ReactNode } from 'react';

export interface RouterOptions {
  root?: FC<{ children: ReactNode }>;
}

export function createRouter(options: RouterOptions = {}): {
  extend: typeof waku.createPages;
  createPages: () => ReturnType<typeof waku.createPages>;
} {
  const { root } = options;
  const createPages: typeof waku.createPages = (fns, options) => {
    return waku.createPages(async (r) => {
      const { createApi, createPage, createRoot } = r;
      const source = await getSource();
      const out = [...(await fns(r))];

      out.push(
        createRoot({
          render: 'static',
          component:
            root ??
            (async (props) => {
              const mod = await import('./layouts/root');
              return mod.default(props);
            }),
        }),
        createPage({
          render: 'static',
          path: '/[...slugs]',
          staticPaths: source.getPages().map((page) => page.slugs),
          async component({ slugs }) {
            const mod = await import('./layouts/docs/page');
            return mod.default({ slugs });
          },
        }),
        createApi({
          render: 'static',
          path: '/llms.txt',
          method: 'GET',
          async handler() {
            return new Response(llms(source).index());
          },
        }),
        createApi({
          render: 'static',
          path: '/llms-full.txt',
          method: 'GET',
          async handler() {
            const scan = source.getPages().map(getLLMText);
            const scanned = await Promise.all(scan);
            return new Response(scanned.join('\n\n'));
          },
        }),
        createApi({
          render: 'static',
          path: '/[...slugs]',
          method: 'GET',
          staticPaths: source.getPages().map((page) => getPageMarkdownUrl(page).segments),
          async handler(_req, { params }) {
            const slugs = [...(params.slugs as string[])];
            if (slugs.length === 0) unstable_notFound();

            slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.md$/, '');
            if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

            const page = source.getPage(slugs);
            if (!page) unstable_notFound();

            return new Response(await getLLMText(page), {
              headers: {
                'Content-Type': 'text/markdown',
              },
            });
          },
        }),
        createApi({
          render: 'static',
          path: '/[...slugs]',
          method: 'GET',
          staticPaths: source.getPages().map((page) => getPageImage(page.slugs).segments),
          async handler(_, { params }) {
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
                site: appName,
              }),
              {
                width: 1200,
                height: 630,
                format: 'webp',
              },
            );
          },
        }),
        createApi({
          render: 'dynamic',
          path: '/api/search',
          handlers: {
            GET: createFromSource(getSource).GET,
          },
        }),
        createPage({
          render: 'dynamic',
          path: '/[...slugs]',
          async component() {
            const mod = await import('./layouts/not-found');
            return mod.default();
          },
        }),
      );

      return out;
    }, options);
  };

  return {
    extend: createPages,
    createPages() {
      return createPages(async () => []);
    },
  };
}
