import type { LoaderConfig, LoaderOutput } from '../loader';
import type * as PageTree from '@/page-tree';

interface Context {
  lang?: string;
}

export interface LLMsConfig {
  TAB?: string;
  renderName?: (item: PageTree.Node | PageTree.Root, ctx: Context) => string;
  renderDescription?: (item: PageTree.Item | PageTree.Folder, ctx: Context) => string;
}

export function llms<C extends LoaderConfig>(loader: LoaderOutput<C>, config: LLMsConfig = {}) {
  const {
    TAB = '  ',
    renderName = (node, ctx): string => {
      if (typeof node.name === 'string') return node.name;
      if ('type' in node && node.type === 'page') {
        const page = loader.getNodePage(node, ctx.lang);
        if (page) return page.data.title ?? '';
      }

      return String(node.name);
    },
    renderDescription = (node, ctx): string => {
      if (typeof node.description === 'string') return node.description;
      if ('type' in node && node.type === 'page') {
        const page = loader.getNodePage(node, ctx.lang);
        if (page) return page.data.description ?? '';
      }

      return String(node.description);
    },
  } = config;

  function index(lang?: string): string {
    if (loader._i18n && lang === undefined) {
      const { languages } = loader._i18n;
      return languages.map(index).join('\n\n');
    }

    const pageTree = loader.getPageTree(lang);
    const out: string[] = [];
    const ctx: Context = { lang };
    out.push(`# ${renderName(pageTree, ctx)}`);
    out.push('');

    function item(name: string, description: string, indent: number) {
      const prefix = TAB.repeat(indent);

      description = description.trim();
      if (description.length > 0) return `${prefix}- ${name}: ${description}`;
      return `${prefix}- ${name}`;
    }

    function onNode(node: PageTree.Node, indent: number) {
      switch (node.type) {
        case 'page': {
          out.push(
            item(
              formatMarkdownLink(renderName(node, ctx), node.url),
              renderDescription(node, ctx),
              indent,
            ),
          );
          break;
        }
        case 'folder': {
          out.push(item(renderName(node, ctx), renderDescription(node, ctx), indent));
          if (node.index) onNode(node.index, indent + 1);
          for (const child of node.children) onNode(child, indent + 1);
          break;
        }
        case 'separator': {
          if (node.name) out.push(item(`**${renderName(node, ctx)}**`, '', indent));
          out.push('');
          break;
        }
      }
    }

    for (const child of pageTree.children) onNode(child, 0);
    return out.join('\n');
  }

  return {
    /**
     * generate `llms.txt` content in Markdown format.
     */
    index,
  };
}

function formatMarkdownLink(title: string, url: string): string {
  const escapedTitle = title.replace(/([[\]])/g, '\\$1');
  const escapedUrl = url.replace(/([()])/g, '\\$1');

  return `[${escapedTitle}](${escapedUrl})`;
}
