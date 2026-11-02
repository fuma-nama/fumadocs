import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { llms } from 'fumadocs-core/source/llms';
import type { Context } from '../context';
import type { ApiRoute, AppShape, Awaitable, Plugin } from '../plugin';

export interface LLMsOptions<C extends AppShape = AppShape> {
  /**
   * Serve the Markdown of a page to requests preferring it (`Accept: text/markdown`), on pages rendered on request.
   *
   * @defaultValue true
   */
  autoRedirect?: boolean;

  /**
   * The Markdown of a page, pages without it have no `.md` file and are left out of `llms-full.txt`.
   *
   * By default, the text of content sources under a heading with the title and URL of the page.
   */
  getLLMText?: (this: Context<C>, page: C['page']) => Awaitable<string | undefined>;
}

/** the path of the Markdown of a page: `<page>.md`, `/index.md` for the root */
function markdownPath(url: string): string {
  return url === '/' ? '/index.md' : `${url}.md`;
}

/** the path of a request without the base path (`withBase('/')`), `undefined` outside of it */
function requestPath(request: Request, base: string): string | undefined {
  const { pathname } = new URL(request.url);
  if (base === '/') return pathname;
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
}

/**
 * `llms.txt`, `llms-full.txt` and the Markdown of pages: `/docs/page.md`, `/index.md` for the root page.
 *
 * Pages rendered on request serve their Markdown to requests preferring it (`Accept: text/markdown`).
 */
export function llmsPlugin<C extends AppShape = AppShape>(
  options: LLMsOptions<NoInfer<C>> = {},
): Plugin<C> {
  const {
    autoRedirect = true,
    getLLMText = async function (page) {
      const [text, { title }] = await Promise.all([this.getPageText(page), this.getPageData(page)]);
      if (text !== undefined) return `# ${title} (${this.absoluteUrl(page.url)})\n\n${text}`;
    },
  } = options;

  async function markdown(
    ctx: Context<C>,
    page: C['page'],
    headers?: Record<string, string>,
  ): Promise<Response | undefined> {
    const text = await getLLMText.call(ctx, page);
    if (text === undefined) return;

    return new Response(text, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers },
    });
  }

  return {
    name: 'llms.txt',
    // after the plugins setting their own `markdownUrl`, and after the middleware of others
    enforce: 'post',
    transformPage(data) {
      return { ...data, markdownUrl: data.markdownUrl ?? this.withBase(markdownPath(data.url)) };
    },
    async routes() {
      const pageText = async (page: C['page']) => {
        if (!(await this.getFallbackOrigin(page))) return getLLMText.call(this, page);
      };
      const routes: ApiRoute[] = [
        {
          path: '/llms.txt',
          GET: async () => new Response(llms(await this.getLoader()).index()),
        },
        {
          path: '/llms-full.txt',
          GET: async () => {
            const pending: Promise<string | undefined>[] = [];
            for (const page of (await this.getLoader()).getPages()) pending.push(pageText(page));

            const texts: string[] = [];
            for (const text of await Promise.all(pending)) if (text !== undefined) texts.push(text);
            return new Response(texts.join('\n\n'));
          },
        },
      ];
      // the middleware serves them, from the pages of revalidated sources
      if (this.mode === 'dynamic') return routes;

      // a route per file, a catch-all route would take the paths of pages
      for (const page of (await this.getLoader()).getPages()) {
        routes.push({
          path: markdownPath(page.url),
          GET: async () => (await markdown(this, page)) ?? new Response(null, { status: 404 }),
        });
      }
      return routes;
    },
    async middleware(request, next) {
      if (this.mode === 'static' || request.method !== 'GET') return next();
      const path = requestPath(request, this.withBase('/'));
      const isMarkdown = path?.endsWith('.md');
      if (path === undefined || (!isMarkdown && !autoRedirect)) return next();
      const source = await this.getLoader();

      if (isMarkdown) {
        const page = source.getPageByUrl(path === '/index.md' ? '/' : path.slice(0, -3));
        return (page && (await markdown(this, page))) ?? next();
      }

      // like `trailingSlash: 'always'`
      const page = source.getPageByUrl(path.replace(/(.)\/$/, '$1'));
      if (!page) return next();
      // both forms are negotiable, caches must key on `Accept`, and caches ignoring it keep the HTML
      if (isMarkdownPreferred(request)) {
        const response = await markdown(this, page, { Vary: 'Accept', 'Cache-Control': 'private' });
        if (response) return response;
      }

      const rendered = await next();
      // the headers of responses like `Response.redirect()` are immutable
      const response = new Response(rendered.body, rendered);
      response.headers.append('Vary', 'Accept');
      return response;
    },
  };
}
