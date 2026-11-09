import path from 'node:path';
import { render } from 'astro:content';
import type { DataStore } from 'astro/loaders';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MDXComponents } from 'mdx/types';
import { root } from 'virtual:fumadocs/config';
import type { MetaData, PageData, Params, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { pageOutputs, renderMarkdown, structuredDataOf, type PageOutputs } from './mdx-runtime';
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
  data: MetaData;
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
   * MDX components for JSX elements in the output, with the runtime analysis of `includeProcessedMarkdown`.
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
  for (const entry of pages)
    files.push({
      type: 'page',
      path: entry.id,
      // `filePath` is relative to the project root
      absolutePath: entry.filePath && path.resolve(root, entry.filePath),
      data: pageData(entry),
      dataAt(params, custom) {
        if (!custom) return pageData(entry, params);
        const { load, structuredData, getText } = pageData(entry, params, custom.props);
        return { ...custom.data, load, structuredData, getText };
      },
    });
  for (const entry of meta) files.push({ type: 'meta', path: entry.id, data: entry.data });
  return { files, baseDir: options?.baseDir };
}

/**
 * @param params - for a page of a dynamic file, the params that its content and outputs read as props
 * @param custom - the custom props passed to the content, the outputs render for them too
 */
function pageData<Entry extends PageEntry>(
  entry: Entry,
  params?: Params,
  custom?: Record<string, unknown>,
): AstroPageData<Entry> {
  const props = { ...params, ...custom };
  const bound = Object.keys(props).length > 0;
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
    ...entry.data,
    // the frontmatter in code of each params
    ...(params && entry.data._frontmatterAt?.[JSON.stringify(params)]),
    async load() {
      const { Content, outputs } = await compile();
      return {
        body: bound
          ? Object.assign(
              (...[result, own, slots]: Parameters<AstroComponentFactory>) =>
                Content(result, { ...props, ...own }, slots),
              Content,
            )
          : Content,
        toc: outputs.toc(props),
        structuredData: await structuredDataOf(outputs, props),
      };
    },
    async structuredData() {
      return structuredDataOf((await compile()).outputs, props);
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
