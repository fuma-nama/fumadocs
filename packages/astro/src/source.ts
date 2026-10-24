import { render } from 'astro:content';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MetaData, PageData, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { dataKey, type FumadocsData } from './shared';

/** an entry of `docsLoader()` */
export interface DocEntry {
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

export interface RenderedPage {
  Content: AstroComponentFactory;
  toc: TOCItemType[];
  structuredData: StructuredData;
}

export type AstroPageData<Entry extends DocEntry = DocEntry> = Entry['data'] & {
  entry: Entry;
  /** render the page with `render()` of `astro:content` */
  render: () => Promise<RenderedPage>;
  structuredData: () => Promise<StructuredData>;
  /**
   * Get the content of page:
   * - `raw`: the source file, without frontmatter.
   * - `processed`: the Markdown processed by Fumadocs, requires `includeProcessedMarkdown`.
   */
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

/**
 * Create a Fumadocs source from Astro content collections, loaded by `docsLoader()` and `metaLoader()`.
 */
export function toFumadocsSource<Doc extends DocEntry, Meta extends MetaEntry>(
  docs: Doc[],
  meta: Meta[],
): StaticSource<{ pageData: AstroPageData<Doc>; metaData: Meta['data'] }> {
  const files: VirtualFile<{ pageData: AstroPageData<Doc>; metaData: Meta['data'] }>[] = [];
  for (const entry of docs) files.push({ type: 'page', path: entry.id, data: pageData(entry) });
  for (const entry of meta) files.push({ type: 'meta', path: entry.id, data: entry.data });
  return { files };
}

function pageData<Entry extends DocEntry>(entry: Entry): AstroPageData<Entry> {
  async function load() {
    const { Content, remarkPluginFrontmatter } = await render(entry);
    const data = remarkPluginFrontmatter[dataKey] as FumadocsData | undefined;
    if (!data)
      throw new Error(
        `"${entry.filePath ?? entry.id}" is not processed by Fumadocs, make sure it is in the \`dir\` of the integration.`,
      );
    return { Content: Content as AstroComponentFactory, data };
  }

  return {
    ...entry.data,
    entry,
    async render() {
      const { Content, data } = await load();
      return { Content, toc: data.toc, structuredData: data.structuredData };
    },
    async structuredData() {
      return (await load()).data.structuredData;
    },
    async getText(type) {
      if (type === 'raw') return entry.body ?? '';
      const { markdown } = (await load()).data;
      if (markdown === undefined)
        throw new Error(
          "getText('processed') requires `includeProcessedMarkdown` in the options of the Fumadocs integration.",
        );
      return markdown;
    },
  };
}
