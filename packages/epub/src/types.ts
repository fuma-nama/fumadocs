import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';

export interface EpubConfig {
  /** Book title */
  title: string;
  /** Author name(s) */
  author?: string | string[];
  /** Book description */
  description?: string;
  /** Language code (e.g. 'en') */
  language?: string;
  /** Publisher name */
  publisher?: string;
  /** Cover image - URL, file path, or path relative to public dir */
  cover?: string;
  /** Output file path - if set, writes to file in addition to returning buffer */
  outputPath?: string;
  /** Filter: include only these pages. Applied first (only pages where includePages(page) === true are considered). */
  includePages?: (page: Page) => boolean;
  /** Filter: exclude these pages. Applied after includePages (removes pages from the include-filtered set). */
  excludePages?: (page: Page) => boolean;
  /** Custom CSS for the EPUB */
  css?: string;
  /** Public directory for resolving /public/... image paths */
  publicDir?: string;
}

export interface EpubExportOptions<Config extends LoaderConfig = LoaderConfig> extends EpubConfig {
  /** Fumadocs source (from loader()) */
  source: LoaderOutput<Config>;
  /** fucntion to get page Markdown content */
  getMarkdown?: (
    page: Page<Config['source']['pageData']>,
  ) => string | undefined | Promise<string | undefined>;
}
