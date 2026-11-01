import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { llms } from 'fumadocs-core/source';
import type { AnyPage, App, Plugin, Route } from '../app';
import { pageMarkdown, pagePath, trimSlash } from '../shared';

/**
 * `llms.txt`, `llms-full.txt` and the Markdown of pages: `/docs/page.md`, `/index.md` for the root page.
 *
 * On a server, pages rendered on request serve their Markdown to requests preferring it (`Accept: text/markdown`).
 */
export function llmsPlugin(): Plugin {
  function markdownUrl(app: App, page: AnyPage) {
    const path = pagePath(app, page);
    return `${app.base}${path ? `${path}.md` : '/index.md'}`;
  }

  let output: ReturnType<typeof createOutput> | undefined;
  function createOutput(app: App) {
    return llms(app.source, { renderPage: (page) => pageMarkdown(app, page) });
  }

  let pages: Map<string, AnyPage> | undefined;
  function markdownResponse(text: string, headers?: HeadersInit) {
    return new Response(text, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers },
    });
  }

  return {
    name: 'llms.txt',
    routes() {
      const llmsOutput = (output ??= createOutput(this));
      const routes: Route[] = [
        { type: 'file', url: `${this.base}/llms.txt`, GET: () => new Response(llmsOutput.index()) },
        {
          type: 'file',
          url: `${this.base}/llms-full.txt`,
          GET: async () => new Response(await llmsOutput.full()),
        },
      ];
      for (const page of this.getPages()) {
        routes.push({
          type: 'file',
          url: markdownUrl(this, page),
          GET: async () => markdownResponse(await llmsOutput.page(page)),
        });
      }
      return routes;
    },
    transformPage(page, data) {
      return { ...data, markdownUrl: markdownUrl(this, page) };
    },
    async middleware(context, next) {
      // prerendered pages are static files, without the headers of requests
      if (context.isPrerendered || context.request.method !== 'GET') return next();
      if (!pages) {
        pages = new Map();
        for (const page of this.getPages()) pages.set(trimSlash(page.url), page);
      }
      const page = pages.get(trimSlash(decodeURI(context.url.pathname)));
      if (!page) return next();

      // both forms are negotiable, caches must key on `Accept`
      if (isMarkdownPreferred(context.request)) {
        output ??= createOutput(this);
        return markdownResponse(await output.page(page), { Vary: 'Accept' });
      }
      const response = await next();
      response.headers.append('Vary', 'Accept');
      return response;
    },
  };
}
