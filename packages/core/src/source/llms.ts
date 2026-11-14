import type { LoaderConfig, LoaderOutput } from './loader';
import type * as PageTree from '@/page-tree';
import type { Awaitable } from '@/types';

interface Context {
  lang?: string;
}

interface RenderContext<C extends LoaderConfig> extends Context {
  loader: LoaderOutput<C>;
  /** link pages to their `.md` files */
  markdown?: boolean;
}

export interface LLMsConfig<Page = unknown> {
  TAB?: string;
  renderName?: (item: PageTree.Node | PageTree.Root, ctx: Context) => string;
  renderDescription?: (
    item: PageTree.Root | PageTree.Item | PageTree.Folder,
    ctx: Context,
  ) => string;
  /**
   * The URL of a link, in files `item.url` is the path of the file it links to, like the `.md` file of a page.
   */
  renderUrl?: (item: PageTree.Item, ctx: Context) => string;

  /**
   * Render a page as Markdown, required by `page()`, `full()` and the files.
   */
  renderPage?: (page: Page) => Awaitable<string>;

  /**
   * The pages in `full()` and the files, every page by default.
   */
  filter?: (page: Page) => boolean;
}

export interface LLMs<IndexOutput extends Awaitable<string> = Awaitable<string>> {
  /**
   * generate `llms.txt` content in Markdown format.
   *
   * use `indexNode(node)` instead for more control (e.g. add extra sections to output).
   */
  index: (lang?: string) => IndexOutput;

  /**
   * generate `llms.txt` content for a single page tree node.
   */
  indexNode: (node: PageTree.Node, lang?: string) => IndexOutput;
}

export interface LLMsWithPages<
  Page,
  IndexOutput extends Awaitable<string> = Awaitable<string>,
> extends LLMs<IndexOutput> {
  /**
   * render a page with `renderPage`.
   */
  page: (page: Page) => Promise<string>;

  /**
   * generate `llms-full.txt` content: every page rendered with `renderPage`.
   */
  full: (lang?: string) => Promise<string>;

  /**
   * The paths of the files for agents, for static output:
   *
   * - `/llms.txt` and `/llms-full.txt`: every page, linked to its `.md` file, and the `llms-full.txt` of directories.
   * - `<dir>/llms-full.txt`: the pages under a URL directory with two or more pages, like `/docs/guide`.
   * - `<page>.md`: a page, `/index.md` for `/`.
   *
   * @param lang - only the pages of a language, required when URLs don't have the locale (`hideLocale: 'always'`)
   */
  files: (lang?: string) => Promise<string[]>;

  /**
   * Respond with the file at a path, `undefined` when there's none.
   *
   * @param lang - only the pages of a language, see `files()`
   */
  serve: (path: string, lang?: string) => Promise<Response | undefined>;
}

export function llms<C extends LoaderConfig = LoaderConfig>(
  input: LoaderOutput<C>,
  config: LLMsConfig<C['page']> & { renderPage: (page: C['page']) => Awaitable<string> },
): LLMsWithPages<C['page'], string>;
export function llms<C extends LoaderConfig = LoaderConfig>(
  input: LoaderOutput<C>,
  config?: LLMsConfig<C['page']>,
): LLMs<string>;
export function llms<C extends LoaderConfig = LoaderConfig>(
  input: () => Awaitable<LoaderOutput<C>>,
  config: LLMsConfig<C['page']> & { renderPage: (page: C['page']) => Awaitable<string> },
): LLMsWithPages<C['page'], Promise<string>>;
export function llms<C extends LoaderConfig = LoaderConfig>(
  input: () => Awaitable<LoaderOutput<C>>,
  config?: LLMsConfig<C['page']>,
): LLMs<Promise<string>>;
export function llms<C extends LoaderConfig = LoaderConfig>(
  input: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  config: LLMsConfig<C['page']> = {},
): LLMs | LLMsWithPages<C['page']> {
  type Page = C['page'];
  const { TAB = '  ', filter = () => true } = config;

  function renderName(node: PageTree.Node | PageTree.Root, ctx: RenderContext<C>): string {
    if (config.renderName) return config.renderName(node, ctx);

    if (node.type === 'page') {
      const page = ctx.loader.getNodePage(node, ctx.lang);
      if (page?.data.title) return page.data.title;
    } else if (node.type !== 'separator') {
      const meta = ctx.loader.getNodeMeta(node, ctx.lang);
      if (meta?.data.title) return meta.data.title;
    }

    return typeof node.name === 'string' ? node.name : '';
  }

  function renderDescription(
    node: PageTree.Root | PageTree.Item | PageTree.Folder,
    ctx: RenderContext<C>,
  ): string {
    if (config.renderDescription) return config.renderDescription(node, ctx);

    if (node.type === 'page') {
      const page = ctx.loader.getNodePage(node, ctx.lang);
      if (page?.data.description) return page.data.description;
    } else {
      const meta = ctx.loader.getNodeMeta(node, ctx.lang);
      if (meta?.data.description) return meta.data.description;
    }

    return typeof node.description === 'string' ? node.description : '';
  }

  function formatListItem(name: string, description: string, indent: number) {
    const prefix = TAB.repeat(indent);

    description = description.trim();
    if (description.length > 0) return `${prefix}- ${name}: ${description}`;
    return `${prefix}- ${name}`;
  }

  function formatNode(node: PageTree.Node, indent: number, ctx: RenderContext<C>): string {
    switch (node.type) {
      case 'page': {
        const page = ctx.markdown && ctx.loader.getNodePage(node, ctx.lang);
        if (page && filter(page)) node = { ...node, url: markdownPath(page.url) };

        return formatListItem(
          formatMarkdownLink(renderName(node, ctx), config.renderUrl?.(node, ctx) ?? node.url),
          renderDescription(node, ctx),
          indent,
        );
      }
      case 'folder': {
        const out: string[] = [];
        out.push(formatListItem(renderName(node, ctx), renderDescription(node, ctx), indent));
        if (node.index) {
          out.push(formatNode(node.index, indent + 1, ctx));
        }
        for (const child of node.children) {
          out.push(formatNode(child, indent + 1, ctx));
        }
        return out.join('\n');
      }
      case 'separator': {
        const name = renderName(node, ctx) || 'Separator';
        return '\n' + formatListItem(`**${name}**`, '', indent);
      }
    }
  }

  function formatIndex(ctx: RenderContext<C>): string {
    const { loader, lang } = ctx;
    if (loader._i18n && lang === undefined) {
      const out: string[] = [];
      for (const language of loader._i18n.languages)
        out.push(formatIndex({ ...ctx, lang: language }));

      return out.join('\n\n');
    }

    const pageTree = loader.getPageTree(lang);
    const out: string[] = [];
    out.push(`# ${renderName(pageTree, ctx)}`, '');
    const description = renderDescription(pageTree, ctx);
    if (description) out.push(`> ${description}`, '');

    for (const child of pageTree.children) out.push(formatNode(child, 0, ctx));
    return out.join('\n');
  }

  function renderPage(page: Page) {
    if (!config.renderPage)
      throw new Error('`renderPage` is required by `page()` and `full()`, see llms() options.');

    return config.renderPage(page);
  }

  async function renderPages(pages: Page[]): Promise<string> {
    return (await Promise.all(pages.map(renderPage))).join('\n\n');
  }

  const getPages = (loader: LoaderOutput<C>, lang?: string) => loader.getPages(lang).filter(filter);

  function withLoader<T>(render: (loader: LoaderOutput<C>) => T): Awaitable<T> {
    if (typeof input === 'function') return Promise.resolve(input()).then(render);
    return render(input);
  }

  async function renderFile(
    loader: LoaderOutput<C>,
    path: string,
    lang?: string,
  ): Promise<string | undefined> {
    if (path === '/llms.txt') {
      let text = formatIndex({ loader, lang, markdown: true });
      const dirs = sections(getPages(loader, lang));
      if (dirs.size > 0) text += '\n\n## Sections\n';
      for (const dir of dirs.keys()) {
        const item: PageTree.Item = { type: 'page', name: dir, url: `${dir}/llms-full.txt` };
        text += `\n- ${formatMarkdownLink(dir, config.renderUrl?.(item, { lang }) ?? item.url)}`;
      }
      return text;
    }
    if (path === '/llms-full.txt') return renderPages(getPages(loader, lang));
    if (path.endsWith('/llms-full.txt')) {
      const dirPages = sections(getPages(loader, lang)).get(
        path.slice(0, -'/llms-full.txt'.length),
      );
      return dirPages && renderPages(dirPages);
    }
    if (path.endsWith('.md')) {
      // `/docs/.md` and `/.md` from page URLs with a trailing slash
      let url = path.slice(0, -'.md'.length).replace(/(.)\/$/, '$1');
      if (url === '/index') url = '/';
      const page = loader.getPageByUrl(url, lang) ?? loader.getPageByUrl(`${url}/`, lang);
      if (page && filter(page)) return renderPage(page);
    }
  }

  return {
    index: (lang) => withLoader((loader) => formatIndex({ loader, lang })),
    indexNode: (node, lang) => withLoader((loader) => formatNode(node, 0, { lang, loader })),
    async page(page) {
      return renderPage(page);
    },
    async full(lang) {
      return withLoader((loader) => renderPages(getPages(loader, lang)));
    },
    async files(lang) {
      return withLoader((loader) => {
        const pages = getPages(loader, lang);
        const out = new Set(['/llms.txt', '/llms-full.txt']);
        for (const page of pages) out.add(markdownPath(page.url));
        for (const dir of sections(pages).keys()) out.add(`${dir}/llms-full.txt`);
        return Array.from(out);
      });
    },
    async serve(path, lang) {
      // middleware calls it on every request, and other paths have no file
      if (!/\.(md|txt)$/.test(path)) return;

      return withLoader(async (loader) => {
        // generated URLs are URI encoded, routers may pass paths decoded
        const encoded = encodeURI(path);
        const text =
          (await renderFile(loader, path, lang)) ??
          (encoded === path ? undefined : await renderFile(loader, encoded, lang));
        if (text === undefined) return;

        return new Response(text, {
          headers: {
            'Content-Type': `${path.endsWith('.md') ? 'text/markdown' : 'text/plain'}; charset=utf-8`,
          },
        });
      });
    },
  };
}

/** the URL directories with two or more pages, and their pages */
function sections<Page extends { url: string }>(pages: Page[]): Map<string, Page[]> {
  const dirs = new Map<string, Page[]>();
  for (const page of pages) {
    const url = page.url.replace(/\/$/, '');
    if (!url.startsWith('/')) continue;

    for (let end = url.length; end > 0; end = url.lastIndexOf('/', end - 1)) {
      const dir = url.slice(0, end);
      const list = dirs.get(dir);
      if (list) list.push(page);
      else dirs.set(dir, [page]);
    }
  }

  for (const [dir, list] of dirs) if (list.length < 2) dirs.delete(dir);
  return dirs;
}

/** the path of the `.md` file of a page: `<page>.md`, `/index.md` for `/` */
function markdownPath(url: string): string {
  return url === '/' ? '/index.md' : `${url.replace(/\/$/, '')}.md`;
}

function formatMarkdownLink(title: string, url: string): string {
  const escapedTitle = title.replace(/([[\]])/g, '\\$1');
  const escapedUrl = url.replace(/([()])/g, '\\$1');

  return `[${escapedTitle}](${escapedUrl})`;
}
