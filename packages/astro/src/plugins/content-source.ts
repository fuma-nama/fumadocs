import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { FC, ReactNode } from 'react';
import type { AnyPage, Plugin } from '../app';

/** the renderer of a page, from `page.data.load()` of content sources like `@fumadocs/local-md` */
interface Renderer {
  structuredData: StructuredData;
  // oxlint-disable-next-line typescript/no-explicit-any -- each component has its props, like `MDXComponents`
  render: (components: Record<string, FC<any>>) => Promise<{ body: ReactNode; toc: TOCItemType[] }>;
}

async function getRenderer(page: AnyPage): Promise<Renderer | undefined> {
  const { load } = page.data as { load?: () => Promise<Partial<Renderer>> };
  if (typeof load !== 'function') return;
  const loaded = await load();
  if (typeof loaded.render === 'function') return loaded as Renderer;
}

/**
 * Render the pages of runtime content sources, whose `page.data.load()` returns a renderer: Local Markdown, Local HTML, Obsidian and Python.
 *
 * Pages render with your MDX components, with relative links resolved.
 */
export function contentSourcePlugin(): Plugin {
  return {
    name: 'content-source',
    async getBody(page) {
      const renderer = await getRenderer(page);
      if (!renderer) return;
      const { body, toc } = await renderer.render({
        ...this.components,
        a: createRelativeLink(this.source, page, this.components.a),
      });
      return { node: body, toc };
    },
    async getText(page) {
      const renderer = await getRenderer(page);
      if (!renderer) return;
      // the source of Markdown pages, the text of others like HTML
      const { content } = page.data as { content?: unknown };
      if (typeof content === 'string' && /\.mdx?$/.test(page.path)) return content;

      const { headings, contents } = renderer.structuredData;
      const lines: string[] = [];
      let heading: string | undefined;
      for (const item of contents) {
        if (item.heading !== heading) {
          heading = item.heading;
          const title = headings.find((entry) => entry.id === heading);
          if (title) lines.push(`## ${title.content}`);
        }
        lines.push(item.content);
      }
      return lines.join('\n\n');
    },
  };
}
