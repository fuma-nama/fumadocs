import path from 'node:path';
import { render } from 'astro:content';
import type { DataStore } from 'astro/loaders';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MDXComponents } from 'mdx/types';
import { root } from 'virtual:fumadocs/config';
import type { MetaData, PageData, Params, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { renderMarkdown } from './mdx-runtime';
import { dataKey, dynamicPageKey, type FumadocsData } from './shared';

/** an entry of Astro content collections */
type DataEntry = NonNullable<ReturnType<DataStore['get']>>;

/** an entry of `pageLoader()` */
export interface PageEntry extends Pick<DataEntry, 'id' | 'filePath' | 'body'> {
  data: PageData;
}

/** an entry of `metaLoader()` */
export interface MetaEntry extends Pick<DataEntry, 'id'> {
  data: MetaData;
}

/** a link in the content of a page */
export interface ExtractedReference {
  href: string;
}

export interface DocData extends Pick<FumadocsData, 'toc' | 'structuredData'> {
  /** the MDX content, as an Astro component */
  body: AstroComponentFactory;
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
  getText: (type: 'raw' | 'processed', options?: GetTextOptions) => Promise<string>;
  /** the links of content, with `extractLinkReferences` */
  extractedReferences?: ExtractedReference[];
  /** the date of its last commit, with `lastModified` */
  lastModified?: Date;
};

export interface GetTextOptions {
  /**
   * MDX components for JSX elements in the output, only available with `output: 'function'` in `includeProcessedMarkdown`.
   *
   * @defaultValue the MDX components of the collection
   */
  components?: MDXComponents;
}

/** the config of the source from `toFumadocsSource()` */
interface AstroSourceConfig<Page extends PageEntry, Meta extends MetaEntry> {
  pageData: AstroPageData<Page>;
  metaData: Meta['data'];
}

/** `getText('processed')` without `includeProcessedMarkdown` */
export class NoProcessedMarkdownError extends Error {
  constructor() {
    super(
      "getText('processed') requires `includeProcessedMarkdown` in the options of the Fumadocs integration.",
    );
  }
}

/**
 * Create a Fumadocs source from Astro content collections, loaded by `pageLoader()` and `metaLoader()`.
 */
export function toFumadocsSource<Page extends PageEntry, Meta extends MetaEntry>(
  pages: Page[],
  meta: Meta[] = [],
  options?: Pick<StaticSource, 'baseDir'>,
): StaticSource<AstroSourceConfig<Page, Meta>> {
  const files: VirtualFile<AstroSourceConfig<Page, Meta>>[] = [];
  /** the ID of a dynamic file -> the entries of its pages, by their params as JSON */
  const dynamicPages = new Map<string, Map<string, Page>>();
  for (const entry of pages) {
    const page = (entry.data as Record<string, unknown>)[dynamicPageKey] as
      | { id: string; params: Params }
      | undefined;
    if (page) {
      let entries = dynamicPages.get(page.id);
      if (!entries) dynamicPages.set(page.id, (entries = new Map()));
      entries.set(JSON.stringify(page.params), entry);
      continue;
    }

    files.push({
      type: 'page',
      path: entry.id,
      // `filePath` is relative to the project root
      absolutePath: entry.filePath && path.resolve(root, entry.filePath),
      data: pageData(entry),
      dataAt(params) {
        const page = dynamicPages.get(entry.id)?.get(JSON.stringify(params));
        if (!page) throw new Error(`"${entry.id}" isn't compiled for ${JSON.stringify(params)}`);
        return pageData(page, params);
      },
    });
  }
  for (const entry of meta) files.push({ type: 'meta', path: entry.id, data: entry.data });
  return { files, baseDir: options?.baseDir };
}

/** @param params - for a page of a dynamic file, the params its content reads as props when rendering */
function pageData<Entry extends PageEntry>(entry: Entry, params?: Params): AstroPageData<Entry> {
  async function compile(): Promise<{ body: AstroComponentFactory; data: FumadocsData }> {
    // `render()` is typed by `astro sync` of projects
    const { Content, remarkPluginFrontmatter } = await render(entry);
    const data: FumadocsData | undefined = remarkPluginFrontmatter[dataKey];
    if (!data)
      throw new Error(
        `"${entry.filePath ?? entry.id}" is not processed by Fumadocs, which only processes the MDX files of its \`collections\`.`,
      );
    const body: AstroComponentFactory = params
      ? Object.assign(
          (...[result, props, slots]: Parameters<AstroComponentFactory>) =>
            Content(result, { ...params, ...props }, slots),
          Content,
        )
      : Content;
    return { body, data };
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
    async getText(type, options) {
      if (type === 'raw') return entry.body ?? '';
      // compiling registers the function output
      const { markdown, markdownId } = (await compile()).data;
      if (markdownId !== undefined)
        return renderMarkdown(markdownId, { ...params, components: options?.components });
      if (markdown === undefined) throw new NoProcessedMarkdownError();
      return markdown;
    },
  };
}
