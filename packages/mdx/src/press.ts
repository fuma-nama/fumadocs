import type { Plugin, PluginContext } from 'fumadocs-core/framework/plugin';
import type { LoaderConfig } from 'fumadocs-core/source';
import type { MDXComponents } from 'mdx/types';
import { createElement, type ComponentProps } from 'react';
import type { AsyncDocCollectionEntry } from '@/runtime/server';
import type { DocData, DocMethods } from '@/runtime/types';

type Awaitable<T> = T | Promise<T>;

export interface MdxPluginOptions {
  /** MDX components of the page body and its processed Markdown, relative links in `a` resolve to the URLs of their pages */
  components?: MDXComponents;
}

/** a page of a Fumadocs MDX collection, loaded eagerly or with `async: true` */
type Entry = DocMethods & (DocData | Pick<AsyncDocCollectionEntry, 'load'>);

/**
 * Render the pages of Fumadocs MDX collections: their body, Markdown, table of contents, structured data and dates.
 */
export default function mdxPlugin<Config extends LoaderConfig = LoaderConfig>({
  components,
}: MdxPluginOptions = {}): Plugin<Config> {
  const Link = components?.a ?? 'a';

  async function getComponents(ctx: PluginContext<Config>, page: Config['page']) {
    const loader = await ctx.getLoader();
    return {
      ...components,
      a: (props: ComponentProps<'a'>) =>
        createElement(Link, { ...props, href: props.href && loader.resolveHref(props.href, page) }),
    };
  }

  return {
    name: 'mdx',
    async getPageBody(page) {
      if (!isEntry(page.data)) return;
      const { body } = await load(page.data);
      return {
        node: createElement(body, { components: await getComponents(this, page) }),
      };
    },
    async getPageText(page) {
      if (!isEntry(page.data)) return;
      return page.data.getText('processed', {
        components: await getComponents(this, page),
      });
    },
    async getPageToc(page) {
      if (isEntry(page.data)) return (await load(page.data)).toc;
    },
    async getPageStructuredData(page) {
      if (isEntry(page.data)) return (await load(page.data)).structuredData;
    },
    getPageCreatedAt({ data }) {
      if (!isEntry(data) || !('date' in data)) return;
      if (data.date instanceof Date) return data.date;
      if (typeof data.date === 'string') return new Date(data.date);
    },
    // from the `last-modified` plugin
    async getPageLastModified(page) {
      if (!isEntry(page.data)) return;
      const data = await load(page.data);
      if ('lastModified' in data && data.lastModified instanceof Date) return data.lastModified;
    },
  };
}

function isEntry(data: object): data is Entry {
  return 'info' in data && typeof data.info === 'object' && ('_exports' in data || 'load' in data);
}

function load(entry: Entry): Awaitable<DocData> {
  return 'load' in entry ? entry.load() : entry;
}
