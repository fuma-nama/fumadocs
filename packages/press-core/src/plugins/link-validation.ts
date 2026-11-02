import { getTableOfContents } from 'fumadocs-core/content/toc';
import type { Context } from '../context';
import type { AppShape, Awaitable, Plugin } from '../plugin';

/**
 * A build problem, in a shape build platforms can render as a check annotation.
 * `rule` is a free-form identifier so other plugins can report their own without changing the schema.
 */
export interface Diagnostic {
  severity: 'error' | 'warning';
  /** e.g. `link-validation/not-found` */
  rule: string;
  message: string;
  /** URL of the page the problem was found on */
  fromPathname?: string;
  href?: string;
}

export interface DiagnosticsFile {
  diagnostics: Diagnostic[];
}

export interface LinkValidationOptions {
  /** whether the link is skipped for validation, like links to pages of your framework outside the content */
  ignored?: (href: string) => boolean;
  /** validate an external link, they are skipped without it */
  externalLink?: (href: string) => Awaitable<'not-found' | null>;

  /**
   * How to report broken links:
   *
   * - `throw`: fail the build with an error message.
   * - `json`: write the diagnostics file and let the build succeed, for deployment platforms that render the results, e.g. as annotations on a pull request.
   * - `both`: write the diagnostics file, then fail the build.
   *
   * @defaultValue "throw"
   */
  report?: 'throw' | 'json' | 'both';

  /**
   * File name of the diagnostics file, relative to the build output. It is written on every build, an empty list tells a clean run apart from no run.
   *
   * @defaultValue "fumapress-diagnostics.json"
   */
  diagnosticsPath?: string;
}

/**
 * Validate the links in the Markdown of pages (`getPageText()`) when the site is built.
 *
 * Links can point to pages and their headings (`getPageToc()`) and to the routes of plugins. Outside `static` mode, a link counts when the middleware of plugins serves it.
 */
export function linkValidationPlugin<C extends AppShape = AppShape>({
  report = 'throw',
  diagnosticsPath = 'fumapress-diagnostics.json',
  ...options
}: LinkValidationOptions = {}): Plugin<C> {
  return {
    name: 'link-validation',
    async build({ emitFile }) {
      const diagnostics = await validateLinks(this, options);
      if (report !== 'throw')
        await emitFile(diagnosticsPath, JSON.stringify({ diagnostics } satisfies DiagnosticsFile));

      if (report !== 'json' && diagnostics.length > 0) {
        const lines: string[] = [];
        for (const item of diagnostics) lines.push(`In "${item.fromPathname}": ${item.message}`);
        throw new Error(`[Fumapress] broken links:\n${lines.join('\n')}`);
      }
    },
  };
}

// a reserved domain, links to other sites never resolve to it
const origin = 'http://fumapress.invalid';

async function validateLinks<C extends AppShape>(
  ctx: Context<C>,
  { ignored, externalLink }: Pick<LinkValidationOptions, 'ignored' | 'externalLink'>,
): Promise<Diagnostic[]> {
  const [source, routes] = await Promise.all([ctx.getLoader(), ctx.getRoutes()]);
  const routePatterns: RegExp[] = [];
  for (const route of routes) routePatterns.push(toPattern(decode(route.path)));
  const pages = source.getPages();
  /** heading ids by decoded page URL, generated URLs are URI encoded */
  const headings = new Map<string, Set<string>>();
  const files = new Set<string>();
  const links = await Promise.all(
    pages.map(async (page) => {
      // a file shared by languages is validated once
      const shared = files.has(page.path);
      files.add(page.path);
      const [toc, text] = await Promise.all([
        ctx.getPageToc(page),
        shared ? undefined : ctx.getPageText(page),
      ]);
      const ids = new Set<string>();
      for (const item of toc ?? []) ids.add(item.url.slice(1));
      headings.set(decode(page.url), ids);
      if (text) return collectLinks(text);
    }),
  );

  const exists = (pathname: string) =>
    headings.has(pathname) || routePatterns.some((pattern) => pattern.test(pathname));
  /** by URL, each is checked once */
  const checked = new Map<string, Promise<boolean>>();
  function check(url: string, run: () => Promise<boolean>): Promise<boolean> {
    let result = checked.get(url);
    if (!result) checked.set(url, (result = run()));
    return result;
  }

  async function isValid(href: string, page: C['page']): Promise<boolean> {
    if (ignored?.(href)) return true;
    const url = new URL(source.resolveHref(href, page), origin + page.url);
    if (url.origin !== origin) {
      if (!externalLink || (url.protocol !== 'http:' && url.protocol !== 'https:')) return true;
      return check(url.href, async () => (await externalLink(href)) === null);
    }

    let pathname = decode(url.pathname);
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    const ids = headings.get(pathname);
    if (ids) return url.hash.length <= 1 || ids.has(decode(url.hash.slice(1)));
    if (ctx.mode === 'static') return exists(pathname);

    // served on demand, like a request to the server, so redirects and rewrites of middleware count
    return check(pathname, async () => {
      const response = await ctx.handleRequest(
        new Request(new URL(ctx.withBase(pathname), origin)),
        async (rewrite) =>
          new Response(null, { status: exists(rewrite ? decode(rewrite) : pathname) ? 200 : 404 }),
      );
      return response.status !== 404;
    });
  }

  const reports = await Promise.all(
    pages.map(async (page, i) => {
      const hrefs = links[i] ?? [];
      const valid = await Promise.all(hrefs.map((href) => isValid(href, page)));
      const out: Diagnostic[] = [];
      for (let j = 0; j < hrefs.length; j++) {
        if (valid[j]) continue;
        out.push({
          severity: 'error',
          rule: 'link-validation/not-found',
          message: `link "${hrefs[j]}" not-found`,
          fromPathname: page.url,
          href: hrefs[j],
        });
      }
      return out;
    }),
  );
  const diagnostics: Diagnostic[] = [];
  for (const items of reports) diagnostics.push(...items);
  return diagnostics;
}

/** the shape of the mdast nodes it reads, `mdast` types are not a dependency */
interface LinkNode {
  type: string;
  url?: string;
  children?: LinkNode[];
}

/** the URLs of links and link definitions in Markdown */
async function collectLinks(text: string): Promise<string[]> {
  const out: string[] = [];
  function visit(node: LinkNode) {
    if ((node.type === 'link' || node.type === 'definition') && node.url) out.push(node.url);
    for (const child of node.children ?? []) visit(child);
  }

  // the remark processor of `fumadocs-core`, its table of contents is unused
  await getTableOfContents(text, [() => visit]);
  return out;
}

/** the pattern of a route path, `[name]` matches a segment and `[...name]` the rest */
function toPattern(path: string): RegExp {
  // params at odd indexes, `...` or undefined
  const parts = path.split(/\[(\.\.\.)?[^\]]+\]/);
  let source = '^';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) source += parts[i] ? '.+' : '[^/]+';
    else source += parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${source}$`);
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
