import { llms } from 'fumadocs-core/source/llms';
import type { Awaitable, ServerPlugin } from '@/lib/types';
import type { ConfigContext } from '@/config';
import { unstable_notFound } from 'waku/router/server';
import type { AppContext } from '@/lib/shared';

export interface LLMsOptions<C extends ConfigContext = ConfigContext> {
  getLLMText?: (this: AppContext<C>, page: C['loaderConfig']['page']) => Awaitable<string>;
}

export function llmsPlugin<C extends ConfigContext = ConfigContext>(
  options: LLMsOptions<C> = {},
): ServerPlugin {
  const {
    getLLMText = async function getLLMTextDefault(page) {
      for (const adapter of this.adapters) {
        const txt = await adapter['core:get-llms-text']?.call(this as unknown as AppContext, page);
        if (txt !== undefined) return txt;
      }

      throw new Error('[Fumapress] Please specify the `getLLMText()` option in llmsPlugin()');
    },
  } = options;

  return {
    init() {
      this.data['core:docs-layout'] ??= {};
      this.data['core:docs-layout'].renderers ??= [];
      this.data['core:docs-layout'].renderers.push(function (res) {
        res.markdownUrl ??= slugsToMarkdownPath(this.page.slugs).url;
        return res;
      });
    },
    async createPages({ createApi }) {
      createApi({
        render: 'static',
        path: '/llms.txt',
        method: 'GET',
        handler: async () => {
          const source = await this.getLoader();
          return new Response(llms(source).index());
        },
      });

      createApi({
        render: 'static',
        path: '/llms-full.txt',
        method: 'GET',
        handler: async () => {
          const source = await this.getLoader();
          const scan = source.getPages().map(getLLMText);
          const scanned = await Promise.all(scan);
          return new Response(scanned.join('\n\n'));
        },
      });

      createApi({
        render: 'static',
        path: '/[...slugs]',
        method: 'GET',
        staticPaths: (await this.getLoader())
          .getPages()
          .map((page) => slugsToMarkdownPath(page.slugs).segments),
        handler: async (_req, { params }) => {
          const slugs = markdownPathToSlugs(params.slugs as string[]);
          const source = await this.getLoader();
          const page = source.getPage(slugs);
          if (!page) unstable_notFound();

          return new Response(await getLLMText.call(this as unknown as AppContext<C>, page), {
            headers: {
              'Content-Type': 'text/markdown',
            },
          });
        },
      });
    },
  };
}

function markdownPathToSlugs(segs: string[]) {
  const slugs = [...segs];
  if (slugs.length === 0) return slugs;

  slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.md$/, '');
  if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

  return slugs;
}

function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}
