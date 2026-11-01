import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { PageData } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { createElement, type ReactNode } from 'react';
import type { Plugin } from '../app';
import { isPageDataOf } from '../shared';

/** the renderer from `load()`, like `MarkdownRenderer` of `@fumadocs/local-md` */
interface Renderer {
  structuredData: StructuredData;
  render: (components: MDXComponents) => Promise<{ body: ReactNode; toc: TOCItemType[] }>;
}

/** the page data of runtime content sources, like `LocalMarkdownPage` of `@fumadocs/local-md` */
interface ContentSourcePageData extends PageData {
  /** the source file, not on generated pages like Python */
  content?: string;
  load: () => Promise<object>;
}

function isContentSourcePageData(data: PageData): data is ContentSourcePageData {
  return isPageDataOf<ContentSourcePageData>(data, 'load');
}

function isRenderer(value: object): value is Renderer {
  return typeof (value as Partial<Renderer>).render === 'function';
}

async function loadRenderer(data: ContentSourcePageData): Promise<Renderer | undefined> {
  const loaded = await data.load();
  // other content sources have `load()` too, like Astro content collections
  if (isRenderer(loaded)) return loaded;
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
      if (!isContentSourcePageData(page.data)) return;
      const renderer = await loadRenderer(page.data);
      if (!renderer) return;
      const { a: Link } = this.components;
      const { body, toc } = await renderer.render({
        ...this.components,
        // `createRelativeLink()` takes function components, MDX components can be any element type
        a: createRelativeLink(this.source, page, Link && ((props) => createElement(Link, props))),
      });
      return { node: body, toc };
    },
    async getText({ data, path }) {
      if (!isContentSourcePageData(data)) return;
      const renderer = await loadRenderer(data);
      if (!renderer) return;
      // the source of Markdown pages, the text of others like HTML
      if (data.content !== undefined && /\.mdx?$/.test(path)) return data.content;

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
