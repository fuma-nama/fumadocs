import type { LoaderConfig, LoaderOutput } from 'fumadocs-core/source';

export interface EpubConfig<Config extends LoaderConfig = LoaderConfig> {
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
  includePages?: (page: Config['page']) => boolean;
  /** Filter: exclude these pages. Applied after includePages (removes pages from the include-filtered set). */
  excludePages?: (page: Config['page']) => boolean;
  /** Custom CSS for the EPUB */
  css?: string;
  /** Public directory for resolving /public/... image paths */
  publicDir?: string;
}

export interface EpubExportOptions<
  Config extends LoaderConfig = LoaderConfig,
> extends EpubConfig<Config> {
  /** Fumadocs source (from loader()) */
  source: LoaderOutput<Config>;
  /** function to get page Markdown content */
  getMarkdown?: (page: Config['page']) => string | undefined | Promise<string | undefined>;
}
