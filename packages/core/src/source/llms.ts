import type { LoaderConfig, LoaderOutput } from './loader';
import type * as PageTree from '@/page-tree';
import type { Awaitable } from '@/types';

interface Context {
  lang?: string;
}

export interface LLMsConfig<Page = unknown> {
  TAB?: string;
  renderName?: (item: PageTree.Node | PageTree.Root, ctx: Context) => string;
  renderDescription?: (
    item: PageTree.Root | PageTree.Item | PageTree.Folder,
    ctx: Context,
  ) => string;

  /**
   * Render a page as Markdown, required by `page()` and `full()`.
   */
  renderPage?: (page: Page) => Awaitable<string>;
}

export interface LLMs {
  /**
   * generate `llms.txt` content in Markdown format.
   *
   * use `indexNode(node)` instead for more control (e.g. add extra sections to output).
   */
  index: (lang?: string) => string;

  /**
   * generate `llms.txt` content for a single page tree node.
   */
  indexNode: (node: PageTree.Node, lang?: string) => string;
}

export interface LLMsWithPages<Page> extends LLMs {
  /**
   * render a page with `renderPage`.
   */
  page: (page: Page) => Promise<string>;

  /**
   * generate `llms-full.txt` content: every page rendered with `renderPage`.
   */
  full: (lang?: string) => Promise<string>;
}

export function llms<C extends LoaderConfig = LoaderConfig>(
  loader: LoaderOutput<C>,
  config: LLMsConfig<C['page']> & { renderPage: (page: C['page']) => Awaitable<string> },
): LLMsWithPages<C['page']>;
export function llms<C extends LoaderConfig = LoaderConfig>(
  loader: LoaderOutput<C>,
  config?: LLMsConfig<C['page']>,
): LLMs;
export function llms<C extends LoaderConfig = LoaderConfig>(
  loader: LoaderOutput<C>,
  config: LLMsConfig<C['page']> = {},
): LLMsWithPages<C['page']> {
  const {
    TAB = '  ',
    renderName = (node, ctx): string => {
      if (node.type === 'page') {
        const page = loader.getNodePage(node, ctx.lang);
        if (page?.data.title) return page.data.title;
      } else if (node.type !== 'separator') {
        const meta = loader.getNodeMeta(node, ctx.lang);
        if (meta?.data.title) return meta.data.title;
      }

      return typeof node.name === 'string' ? node.name : '';
    },
    renderDescription = (node, ctx): string => {
      if (node.type === 'page') {
        const page = loader.getNodePage(node, ctx.lang);
        if (page?.data.description) return page.data.description;
      } else {
        const meta = loader.getNodeMeta(node, ctx.lang);
        if (meta?.data.description) return meta.data.description;
      }

      return typeof node.description === 'string' ? node.description : '';
    },
  } = config;

  function formatListItem(name: string, description: string, indent: number) {
    const prefix = TAB.repeat(indent);

    description = description.trim();
    if (description.length > 0) return `${prefix}- ${name}: ${description}`;
    return `${prefix}- ${name}`;
  }

  function formatNode(node: PageTree.Node, indent: number, ctx: Context): string {
    switch (node.type) {
      case 'page': {
        return formatListItem(
          formatMarkdownLink(renderName(node, ctx), node.url),
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

  function index(lang?: string): string {
    if (loader._i18n && lang === undefined) {
      const { languages } = loader._i18n;
      return languages.map(index).join('\n\n');
    }

    const pageTree = loader.getPageTree(lang);
    const out: string[] = [];
    const ctx: Context = { lang };
    out.push(`# ${renderName(pageTree, ctx)}`, '');
    const description = renderDescription(pageTree, ctx);
    if (description) out.push(`> ${description}`, '');

    for (const child of pageTree.children) out.push(formatNode(child, 0, ctx));
    return out.join('\n');
  }

  function renderPage(page: C['page']) {
    if (!config.renderPage)
      throw new Error('`renderPage` is required by `page()` and `full()`, see llms() options.');

    return config.renderPage(page);
  }

  return {
    index,
    indexNode(node, lang) {
      return formatNode(node, 0, { lang });
    },
    async page(page) {
      return renderPage(page);
    },
    async full(lang) {
      const rendered: Awaitable<string>[] = [];
      for (const page of loader.getPages(lang)) rendered.push(renderPage(page));

      return (await Promise.all(rendered)).join('\n\n');
    },
  };
}

function formatMarkdownLink(title: string, url: string): string {
  const escapedTitle = title.replace(/([[\]])/g, '\\$1');
  const escapedUrl = url.replace(/([()])/g, '\\$1');

  return `[${escapedTitle}](${escapedUrl})`;
}
