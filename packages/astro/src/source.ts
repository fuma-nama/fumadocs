import { render } from 'astro:content';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MetaData, PageData, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { dataKey, type FumadocsData } from './shared';

/** an entry of `pageLoader()` */
export interface PageEntry {
  id: string;
  data: PageData;
  filePath?: string;
  body?: string;
}

/** an entry of `metaLoader()` */
export interface MetaEntry {
  id: string;
  data: MetaData;
}

export interface DocData {
  /** the MDX content, as an Astro component */
  body: AstroComponentFactory;
  toc: TOCItemType[];
  structuredData: StructuredData;
}

export type AstroPageData<Entry extends PageEntry = PageEntry> = Entry['data'] & {
  /** the content, rendered with `render()` of `astro:content` */
  load: () => Promise<DocData>;
  structuredData: () => Promise<StructuredData>;
  /**
   * Get the content of page:
   * - `raw`: the source file, without frontmatter.
   * - `processed`: the Markdown processed by Fumadocs, requires `includeProcessedMarkdown`.
   */
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

/**
 * Create a Fumadocs source from Astro content collections, loaded by `pageLoader()` and `metaLoader()`.
 */
export function toFumadocsSource<Page extends PageEntry, Meta extends MetaEntry>(
  pages: Page[],
  meta: Meta[] = [],
): StaticSource<{ pageData: AstroPageData<Page>; metaData: Meta['data'] }> {
  const files: VirtualFile<{ pageData: AstroPageData<Page>; metaData: Meta['data'] }>[] = [];
  for (const entry of pages) files.push({ type: 'page', path: entry.id, data: pageData(entry) });
  for (const entry of meta) files.push({ type: 'meta', path: entry.id, data: entry.data });
  return { files };
}

function pageData<Entry extends PageEntry>(entry: Entry): AstroPageData<Entry> {
  async function compile() {
    const { Content, remarkPluginFrontmatter } = await render(entry);
    const data = remarkPluginFrontmatter[dataKey] as FumadocsData | undefined;
    if (!data)
      throw new Error(
        `"${entry.filePath ?? entry.id}" is not processed by Fumadocs, which only processes the MDX files of its \`collections\`.`,
      );
    return { body: Content as AstroComponentFactory, data };
  }

  return {
    ...entry.data,
    async load() {
      const { body, data } = await compile();
      return { body, toc: data.toc, structuredData: data.structuredData };
    },
    async structuredData() {
      return (await compile()).data.structuredData;
    },
    async getText(type) {
      if (type === 'raw') return entry.body ?? '';
      const { markdown } = (await compile()).data;
      if (markdown === undefined)
        throw new Error(
          "getText('processed') requires `includeProcessedMarkdown` in the options of the Fumadocs integration.",
        );
      return markdown;
    },
  };
}
