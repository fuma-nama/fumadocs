import { llms } from 'fumadocs-core/source/llms';
import type { ServerPlugin } from '.';
import type { Awaitable } from '@/lib/types';
import type { ConfigContext } from '@/config';
import { markdownPathToSlugs, slugsToMarkdownPath } from '@/lib/source';
import { unstable_notFound } from 'waku/router/server';
import { Page } from 'fumadocs-core/source';

export interface LLMsOptions<C extends ConfigContext = ConfigContext> {
  getLLMText?: (page: C['loaderConfig']['page']) => Awaitable<string>;
}

export function llmsPlugin<C extends ConfigContext = ConfigContext>(
  options: LLMsOptions<C> = {},
): ServerPlugin {
  const { getLLMText = getLLMTextDefault } = options;

  return {
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

async function getLLMTextDefault(page: Page) {
  if ('getText' in page.data && typeof page.data.getText === 'function') {
    const processed = await page.data.getText('processed');

    return `# ${page.data.title} (${page.url})\n\n${processed}`;
  }

  if ('content' in page.data && typeof page.data.content === 'string') {
    return `# ${page.data.title} (${page.url})\n\n${page.data.content}`;
  }

  throw new Error('[Fumapress] Please specify the `getLLMText()` option');
}
