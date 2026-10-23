import type { TOCItemType } from 'fumadocs-core/toc';
import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import { type Components, toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import type { Root } from 'hast';

export interface HtmlRenderer {
  structuredData: StructuredData;
  render: (components?: Partial<Components>) => Promise<HtmlRendererResult>;
  renderSync: (components?: Partial<Components>) => HtmlRendererResult;
  serialize: () => HtmlRendererOptions;
}

export interface HtmlRendererResult {
  toc: TOCItemType[];
  body: ReactNode;
}

export interface HtmlRendererOptions {
  tree: Root;
  filePath?: string;
  structuredData?: StructuredData;
  rehypeToc?: RehypeTOCItemType[];
}

export function fromAst(options: HtmlRendererOptions): HtmlRenderer {
  const {
    structuredData = {
      headings: [],
      contents: [],
    },
    rehypeToc = [],
    tree,
  } = options;

  function renderSync(components?: Partial<Components>): HtmlRendererResult {
    function render(tree: Root): ReactNode {
      return toJsx(tree, { components });
    }

    const toc = rehypeToc.map((item): TOCItemType => ({
      ...item,
      title: render({
        type: 'root',
        children: item.title.children,
      }),
    }));

    return {
      toc,
      body: render(tree),
    };
  }

  return {
    structuredData,
    renderSync,
    async render(components) {
      return renderSync(components);
    },
    serialize() {
      return options;
    },
  };
}
