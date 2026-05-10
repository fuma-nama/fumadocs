import type { Awaitable, ServerPlugin } from '@/lib/types';
import { unstable_notFound } from 'waku/router/server';
import { createElement, type ReactNode } from 'react';
import type { ConfigContext } from '@/config';
import type { AppContext } from '@/lib/shared';
import { ImageResponse, type ImageResponseOptions } from '@takumi-rs/image-response';

export interface TakumiOptions<C extends ConfigContext = ConfigContext> {
  generate?: (
    this: AppContext<C>,
    page: C['loaderConfig']['page'],
  ) => Awaitable<{
    node: ReactNode;
    options?: Partial<ImageResponseOptions>;
  }>;
}

export function takumiPlugin<C extends ConfigContext = ConfigContext>(
  options: TakumiOptions<C> = {},
): ServerPlugin {
  const {
    generate = async function generateDefault(page) {
      const { generate } = await import('fumadocs-ui/og/takumi');

      return {
        node: generate({
          title: page.data.title,
          description: page.data.description,
          site: this.siteConfig.name,
        }),
      };
    },
  } = options;
  return {
    init() {
      const hooks = (this.data['core:page-meta'] ??= []);
      hooks.push((page) => {
        return createElement('meta', {
          property: 'og:image',
          content: slugsToImagePath(page.slugs, page.locale).url,
        });
      });
    },
    async createPages({ createApiIsomorphic }) {
      const renderMode = this.mode === 'dynamic' ? 'dynamic' : 'static';

      createApiIsomorphic({
        render: renderMode,
        path: this.i18nConfig ? '/[lang]/[...slugs]' : '/[...slugs]',
        staticPaths:
          renderMode === 'static'
            ? (await this.getLoader())
                .getPages()
                .map((page) => slugsToImagePath(page.slugs, page.locale).segments)
            : undefined,
        handler: async (_, { params }) => {
          const source = await this.getLoader();
          const page = source.getPage(
            imagePathToSlugs(params.slugs as string[]),
            params.lang as string,
          );
          if (!page) unstable_notFound();

          const { node, options } = await generate.call(this as unknown as AppContext<C>, page);
          return new ImageResponse(node, {
            width: 1200,
            height: 630,
            ...options,
            format: 'webp',
          });
        },
      });
    },
  };
}

function slugsToImagePath(slugs: string[], lang?: string) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.webp');
  } else {
    segments[segments.length - 1] += '.webp';
  }

  if (lang) {
    segments.unshift(lang);
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
