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
    getLLMText: _getLLMText = async function getLLMTextDefault(page) {
      for (const adapter of this.adapters) {
        const txt = await adapter['core:get-text']?.call(this as unknown as AppContext, page);

        if (txt !== undefined) {
          return `# ${page.data.title} (${page.url})\n\n${txt}`;
        }
      }

      throw new Error('[Fumapress] Please specify the `getLLMText()` option in llmsPlugin()');
    },
  } = options;

  return {
    init() {
      this.data['core:docs-layout'] ??= {};
      this.data['core:docs-layout'].renderers ??= [];
      this.data['core:docs-layout'].renderers.push(function (res) {
        res.markdownUrl ??= slugsToMarkdownPath(this.page.slugs, this.page.locale).url;
        return res;
      });
    },
    async createPages({ createApiIsomorphic }) {
      const defaultRenderMode = this.mode === 'dynamic' ? 'dynamic' : 'static';
      const getLLMText = _getLLMText.bind(this as unknown as AppContext<C>);

      createApiIsomorphic({
        render: defaultRenderMode,
        path: '/llms.txt',
        handler: async () => {
          const source = await this.getLoader();
          return new Response(llms(source).index());
        },
      });

      createApiIsomorphic({
        render: defaultRenderMode,
        path: '/llms-full.txt',
        handler: async () => {
          const source = await this.getLoader();
          const scan = source.getPages().map(getLLMText);
          const scanned = await Promise.all(scan);
          return new Response(scanned.join('\n\n'));
        },
      });

      createApiIsomorphic({
        render: defaultRenderMode,
        path: this.i18nConfig ? '/[lang]/[...slugs]' : '/[...slugs]',
        staticPaths:
          defaultRenderMode === 'static'
            ? (await this.getLoader())
                .getPages()
                .map((page) => slugsToMarkdownPath(page.slugs, page.locale).segments)
            : undefined,
        handler: async (_req, { params }) => {
          const source = await this.getLoader();
          const page = source.getPage(
            markdownPathToSlugs(params.slugs as string[]),
            params.lang as string,
          );
          if (!page) unstable_notFound();

          return new Response(await getLLMText(page), {
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

function slugsToMarkdownPath(slugs: string[], lang?: string) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  if (lang) {
    segments.unshift(lang);
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}
