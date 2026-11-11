import path from 'node:path';
import { render } from 'astro:content';
import type { DataStore } from 'astro/loaders';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MDXComponents } from 'mdx/types';
import { root } from 'virtual:fumadocs/config';
import type { MetaData, PageData, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { pageOutputs, recordsOf, renderMarkdown, type PageOutputs } from './mdx-runtime';
import { readStructuredData, renderStructuredData } from '../../shared/structured-data';
import { dataKey } from './shared';

/** an entry of Astro content collections */
type DataEntry = NonNullable<ReturnType<DataStore['get']>>;

/** an entry of `pageLoader()` */
export interface PageEntry extends Pick<DataEntry, 'id' | 'filePath' | 'body'> {
  data: PageData & {
    /** for a dynamic file with frontmatter in code, the data of each listed params, by the params as JSON */
    _frontmatterAt?: Record<string, PageData>;
  };
}

/** an entry of `metaLoader()` */
export interface MetaEntry extends Pick<DataEntry, 'id'> {
  data: MetaData & {
    /** for a meta module of a dynamic folder, its data in the folder of each listed params, by the params as JSON */
    _dataAt?: Record<string, MetaData>;
  };
}

/** a link in the content of a page */
export interface ExtractedReference {
  href: string;
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
  getText: (type: 'raw' | 'processed', options?: GetTextOptions) => Promise<string>;
  /** the links of content, with `extractLinkReferences` */
  extractedReferences?: ExtractedReference[];
  /** the date of its last commit, with `lastModified` */
  lastModified?: Date;
};

export interface GetTextOptions {
  /**
   * MDX components for JSX elements in the output, when processed Markdown is a component.
   *
   * @deprecated pass them as page props, with the `props` option of `getPage()`
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
  for (const entry of pages) {
    const { data } = entry;
    const { _frontmatterAt: at } = data;
    files.push({
      type: 'page',
      path: entry.id,
      // `filePath` is relative to the project root
      absolutePath: entry.filePath && path.resolve(root, entry.filePath),
      data: pageData(entry, data),
      dataAt: (params, custom) =>
        custom
          ? pageData(entry, custom.data, { ...params, ...custom.props })
          : // the frontmatter in code of each params
            pageData(entry, at ? { ...data, ...at[JSON.stringify(params)] } : data, params),
    });
  }
  for (const { id, data } of meta) {
    const { _dataAt: at } = data;
    files.push({
      type: 'meta',
      path: id,
      data,
      dataAt: at && ((params) => ({ ...data, ...at[JSON.stringify(params)] })),
    });
  }
  return { files, baseDir: options?.baseDir };
}

/** the data of a page with its content, which renders for props: the path params and custom props */
function pageData<Data extends PageEntry['data']>(
  entry: PageEntry,
  data: Data,
  props?: Record<string, unknown>,
): Data & AstroPageData {
  async function compile(): Promise<{ Content: AstroComponentFactory; outputs: PageOutputs }> {
    // `render()` is typed by `astro sync` of projects, it imports the module that registers the outputs
    const { Content, remarkPluginFrontmatter } = await render(entry);
    const outputs = pageOutputs.get(remarkPluginFrontmatter[dataKey]);
    if (!outputs)
      throw new Error(
        `"${entry.filePath ?? entry.id}" is not processed by Fumadocs, which only processes the MDX files of its \`collections\`.`,
      );
    return { Content, outputs };
  }

  return {
    ...data,
    async load() {
      const { Content, outputs } = await compile();
      const { toc, structuredData } = outputs;
      return {
        body: props
          ? Object.assign(
              (...[result, own, slots]: Parameters<AstroComponentFactory>) =>
                Content(result, { ...props, ...own }, slots),
              Content,
            )
          : Content,
        toc: typeof toc === 'function' ? toc(props ?? {}) : toc,
        // read without rendering, `structuredData()` renders it
        get structuredData() {
          return typeof structuredData === 'function'
            ? readStructuredData(recordsOf(structuredData), props ?? {})
            : structuredData;
        },
      };
    },
    async structuredData() {
      const { structuredData, components } = (await compile()).outputs;
      if (typeof structuredData !== 'function') return structuredData;
      // with the MDX components of the collection by default
      return renderStructuredData(recordsOf(structuredData), { components, ...props });
    },
    async getText(type, options) {
      if (type === 'raw') return entry.body ?? '';
      const { markdown, components } = (await compile()).outputs;
      if (markdown === undefined) throw new NoProcessedMarkdownError();
      if (typeof markdown === 'string') return markdown;
      // the components of the page props, then those of the collection
      return renderMarkdown(markdown, {
        components,
        ...props,
        ...(options?.components && { components: options.components }),
      });
    },
  };
}
