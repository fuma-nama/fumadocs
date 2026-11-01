import { llms } from 'fumadocs-core/source';
import type { AnyPage, App, Plugin, Route } from '../app';

export interface LLMsOptions {
  /** prefix of the Markdown of pages, @defaultValue '/llms.mdx' */
  prefix?: string;
}

/**
 * `llms.txt`, `llms-full.txt` and the Markdown of pages.
 */
export function llmsPlugin({ prefix = '/llms.mdx' }: LLMsOptions = {}): Plugin {
  function markdownUrl(app: App, page: AnyPage) {
    return `${app.base}${prefix}${app.toPath(page.url).replace(/\/$/, '')}/content.md`;
  }

  return {
    name: 'llms.txt',
    routes() {
      const output = llms(this.source, {
        renderPage: async (page) => `# ${page.data.title} (${page.url})

${await this.getText(page)}`,
      });
      const routes: Route[] = [
        { type: 'file', url: `${this.base}/llms.txt`, GET: () => new Response(output.index()) },
        {
          type: 'file',
          url: `${this.base}/llms-full.txt`,
          GET: async () => new Response(await output.full()),
        },
      ];
      for (const page of this.getPages()) {
        routes.push({
          type: 'file',
          url: markdownUrl(this, page),
          GET: async () =>
            new Response(await output.page(page), {
              headers: { 'Content-Type': 'text/markdown' },
            }),
        });
      }
      return routes;
    },
    transformPage(page, data) {
      return { ...data, markdownUrl: markdownUrl(this, page) };
    },
  };
}
