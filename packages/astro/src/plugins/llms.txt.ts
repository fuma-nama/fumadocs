import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { llms, type LLMsWithPages, type Page } from 'fumadocs-core/source';
import type { App, Plugin, Route } from '../app';
import { pageMarkdown, pagePath, trimSlash } from '../shared';

/**
 * `llms.txt`, `llms-full.txt` and the Markdown of pages: `/docs/page.md`, `/index.md` for the root page.
 *
 * On a server, pages rendered on request serve their Markdown to requests preferring it (`Accept: text/markdown`).
 */
export function llmsPlugin(): Plugin {
  let output: LLMsWithPages<Page, string> | undefined;
  // URL without the trailing slash -> page, for the middleware
  let pages: Map<string, Page> | undefined;

  function getOutput(app: App) {
    return (output ??= llms(app.source, { renderPage: (page) => pageMarkdown(app, page) }));
  }

  return {
    name: 'llms.txt',
    routes() {
      const routes: Route[] = [
        {
          type: 'file',
          url: `${this.base}/llms.txt`,
          GET: () => new Response(getOutput(this).index()),
        },
        {
          type: 'file',
          url: `${this.base}/llms-full.txt`,
          GET: async () => new Response(await getOutput(this).full()),
        },
      ];
      for (const page of this.getPages()) {
        routes.push({
          type: 'file',
          url: markdownUrl(this, page),
          GET: async () => markdownResponse(await getOutput(this).page(page)),
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
      // encoded like page URLs
      const page = pages.get(trimSlash(context.url.pathname));
      if (!page) return next();

      // both forms are negotiable, caches must key on `Accept`, and caches ignoring it keep the HTML
      if (isMarkdownPreferred(context.request))
        return markdownResponse(await getOutput(this).page(page), {
          Vary: 'Accept',
          'Cache-Control': 'private',
        });
      // the headers of responses like `Response.redirect()` are immutable
      const rendered = await next();
      const response = new Response(rendered.body, rendered);
      response.headers.append('Vary', 'Accept');
      return response;
    },
  };
}

function markdownUrl(app: App, page: Page): string {
  const path = pagePath(app, page);
  return `${app.base}${path ? `${path}.md` : '/index.md'}`;
}

function markdownResponse(text: string, headers?: HeadersInit): Response {
  return new Response(text, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers },
  });
}
