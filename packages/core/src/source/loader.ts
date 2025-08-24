import type * as PageTree from '@/source/page-tree/definitions';
import type { I18nConfig } from '@/i18n';
import {
  type ContentStorage,
  loadFiles,
  type MetaFile,
  type PageFile,
  type Transformer,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import { type BaseOptions, createPageTreeBuilder } from './page-tree/builder';
import {
  basename,
  dirname,
  extname,
  type FileInfo,
  parseFilePath,
} from './path';
import { joinPath } from '@/utils/path';

export interface LoaderConfig {
  source: SourceConfig;
  i18n: I18nConfig | undefined;
}

export interface SourceConfig {
  pageData: PageData;
  metaData: MetaData;
}

export interface LoaderOptions<
  T extends SourceConfig = SourceConfig,
  I18n extends I18nConfig | undefined = I18nConfig | undefined,
> {
  baseUrl: string;

  icon?: NonNullable<BaseOptions['resolveIcon']>;
  slugs?: (info: FileInfo) => string[];
  url?: UrlFn;

  source: Source<T> | Source<T>[];
  transformers?: Transformer[];

  /**
   * Additional options for page tree builder
   */
  pageTree?: Partial<BaseOptions<T['pageData'], T['metaData']>>;

  /**
   * Configure i18n
   */
  i18n?: I18n;
}

export interface Source<Config extends SourceConfig> {
  /**
   * @internal
   */
  _config?: Config;
  files: VirtualFile[] | (() => VirtualFile[]);
}

interface SharedFileInfo {
  /**
   * Virtualized file path (parsed)
   *
   * @deprecated Use `path` instead.
   */
  file: FileInfo;

  /**
   * Virtualized file path (relative to content directory)
   *
   * @example `docs/page.mdx`
   */
  path: string;

  /**
   * Absolute path of the file
   */
  absolutePath: string;
}

export interface VirtualFile {
  /**
   * Virtualized path (relative to content directory)
   *
   * @example `docs/page.mdx`
   */
  path: string;

  /**
   * Absolute path of the file
   */
  absolutePath?: string;

  type: 'page' | 'meta';

  /**
   * Specified Slugs for page
   */
  slugs?: string[];
  data: unknown;
}

export interface Page<Data = PageData> extends SharedFileInfo {
  slugs: string[];
  url: string;
  data: Data;

  locale?: string | undefined;
}

export interface Meta<Data = MetaData> extends SharedFileInfo {
  data: Data;
}

export interface LanguageEntry<Data = PageData> {
  language: string;
  pages: Page<Data>[];
}

export interface LoaderOutput<Config extends LoaderConfig> {
  pageTree: Config['i18n'] extends I18nConfig
    ? Record<string, PageTree.Root>
    : PageTree.Root;

  getPageTree: (locale?: string) => PageTree.Root;
  getPageByHref: (
    href: string,
    options?: {
      language?: string;

      /**
       * resolve relative file paths in `href` from specified dirname, must be a virtual path.
       */
      dir?: string;
    },
  ) =>
    | {
        page: Page<Config['source']['pageData']>;
        hash?: string;
      }
    | undefined;

  _i18n?: I18nConfig;

  /**
   * Get list of pages from language
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (language?: string) => Page<Config['source']['pageData']>[];

  getLanguages: () => LanguageEntry<Config['source']['pageData']>[];

  /**
   * Get page with slugs
   *
   * @param language - If empty, the default language will be used
   */
  getPage: (
    slugs: string[] | undefined,
    language?: string,
  ) => Page<Config['source']['pageData']> | undefined;

  getNodePage: (
    node: PageTree.Item,
    language?: string,
  ) => Page<Config['source']['pageData']> | undefined;

  getNodeMeta: (
    node: PageTree.Folder,
    language?: string,
  ) => Meta<Config['source']['metaData']> | undefined;

  /**
   * generate static params for Next.js SSG
   *
   * @param slug - customise parameter name for slugs
   * @param lang - customise parameter name for lang
   */
  generateParams: <
    TSlug extends string = 'slug',
    TLang extends string = 'lang',
  >(
    slug?: TSlug,
    lang?: TLang,
  ) => (Record<TSlug, string[]> & Record<TLang, string>)[];
}

function indexPages(storages: Record<string, ContentStorage>, getUrl: UrlFn) {
  const result = {
    // (locale.slugs -> page)
    pages: new Map<string, Page>(),
    // (locale.path -> page)
    pathToMeta: new Map<string, Meta>(),
    // (locale.path -> meta)
    pathToPage: new Map<string, Page>(),
  };

  for (const [lang, storage] of Object.entries(storages)) {
    for (const filePath of storage.getFiles()) {
      const item = storage.read(filePath)!;
      const path = `${lang}.${filePath}`;

      if (item.format === 'meta') {
        result.pathToMeta.set(path, fileToMeta(item));
        continue;
      }

      const page = fileToPage(item, getUrl, lang);
      result.pathToPage.set(path, page);
      result.pages.set(`${lang}.${page.slugs.join('/')}`, page);
    }
  }

  return result;
}

export function createGetUrl(baseUrl: string, i18n?: I18nConfig): UrlFn {
  const baseSlugs = baseUrl.split('/');

  return (slugs, locale) => {
    const hideLocale = i18n?.hideLocale ?? 'never';
    let urlLocale: string | undefined;

    if (hideLocale === 'never') {
      urlLocale = locale;
    } else if (
      hideLocale === 'default-locale' &&
      locale !== i18n?.defaultLanguage
    ) {
      urlLocale = locale;
    }

    const paths = [...baseSlugs, ...slugs];
    if (urlLocale) paths.unshift(urlLocale);

    return `/${paths.filter((v) => v.length > 0).join('/')}`;
  };
}

export function loader<
  Config extends SourceConfig,
  I18n extends I18nConfig | undefined = undefined,
>(
  options: LoaderOptions<Config, I18n>,
): LoaderOutput<{
  source: Config;
  i18n: I18n;
}> {
  // @ts-expect-error -- forced type cast
  return createOutput(options);
}

function loadSource<T extends SourceConfig>(source: Source<T> | Source<T>[]) {
  const out: VirtualFile[] = [];

  for (const item of Array.isArray(source) ? source : [source]) {
    if (typeof item.files === 'function') {
      out.push(...item.files());
    } else {
      out.push(...item.files);
    }
  }

  return out;
}

function createOutput(options: LoaderOptions): LoaderOutput<LoaderConfig> {
  if (!options.url && !options.baseUrl) {
    console.warn('`loader()` now requires a `baseUrl` option to be defined.');
  }

  const {
    source,
    baseUrl = '/',
    i18n,
    slugs: slugsFn,
    url: getUrl = createGetUrl(baseUrl ?? '/', i18n),
    transformers = [],
  } = options;
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const files = loadSource(source);

  const transformerSlugs: Transformer = ({ storage }) => {
    const indexFiles = new Set<string>();
    const taken = new Set<string>();
    // for custom slugs function, don't handle conflicting cases like `dir/index.mdx` vs `dir.mdx`
    const autoIndex = slugsFn === undefined;

    for (const path of storage.getFiles()) {
      const file = storage.read(path);
      if (!file || file.format !== 'page' || file.slugs) continue;

      if (isIndex(path) && autoIndex) {
        indexFiles.add(path);
        continue;
      }

      file.slugs = slugsFn ? slugsFn(parseFilePath(path)) : getSlugs(path);

      const key = file.slugs.join('/');
      if (taken.has(key)) throw new Error('Duplicated slugs');
      taken.add(key);
    }

    for (const path of indexFiles) {
      const file = storage.read(path);
      if (file?.format !== 'page') continue;

      file.slugs = getSlugs(path);
      if (taken.has(file.slugs.join('/'))) file.slugs.push('index');
    }
  };

  const storages = loadFiles(
    files,
    {
      buildFile(file) {
        if (file.type === 'page') {
          return {
            format: 'page',
            path: file.path,
            slugs: file.slugs,
            data: file.data,
            absolutePath: file.absolutePath ?? '',
          } as PageFile;
        }

        return {
          format: 'meta',
          path: file.path,
          absolutePath: file.absolutePath ?? '',
          data: file.data,
        } as MetaFile;
      },
      transformers: [transformerSlugs, ...transformers],
    },
    i18n ?? {
      defaultLanguage,
      parser: 'none',
      languages: [defaultLanguage],
    },
  );

  const walker = indexPages(storages, getUrl);
  const builder = createPageTreeBuilder(getUrl);
  let pageTree: Record<string, PageTree.Root> | undefined;

  return {
    _i18n: i18n,
    get pageTree() {
      pageTree ??= builder.buildI18n({
        storages,
        resolveIcon: options.icon,
        ...options.pageTree,
      });

      return i18n
        ? (pageTree as unknown as LoaderOutput<LoaderConfig>['pageTree'])
        : pageTree[defaultLanguage];
    },
    set pageTree(v) {
      if (i18n) {
        pageTree = v as unknown as Record<string, PageTree.Root>;
      } else {
        pageTree = {
          [defaultLanguage]: v,
        };
      }
    },
    getPageByHref(href, { dir = '', language } = {}) {
      const [value, hash] = href.split('#', 2);
      let target;

      if (
        value.startsWith('.') &&
        (value.endsWith('.md') || value.endsWith('.mdx'))
      ) {
        const path = joinPath(dir, value);

        target = walker.pathToPage.get(`${language}.${path}`);
      } else {
        target = this.getPages(language).find((item) => item.url === value);
      }

      if (target)
        return {
          page: target,
          hash,
        };
    },
    getPages(language = defaultLanguage) {
      const pages: Page[] = [];

      for (const [key, value] of walker.pages.entries()) {
        if (key.startsWith(`${language}.`)) pages.push(value);
      }

      return pages;
    },
    getLanguages() {
      const list: LanguageEntry[] = [];
      if (!options.i18n) return list;

      for (const language of options.i18n.languages) {
        list.push({
          language,
          pages: this.getPages(language),
        });
      }

      return list;
    },
    getPage(slugs = [], language = defaultLanguage) {
      return walker.pages.get(`${language}.${slugs.join('/')}`);
    },
    getNodeMeta(node, language = defaultLanguage) {
      const ref = node.$ref?.metaFile;
      if (!ref) return;

      return walker.pathToMeta.get(`${language}.${ref}`);
    },
    getNodePage(node, language = defaultLanguage) {
      const ref = node.$ref?.file;
      if (!ref) return;

      return walker.pathToPage.get(`${language}.${ref}`);
    },
    getPageTree(locale) {
      if (options.i18n) {
        return this.pageTree[
          (locale ?? defaultLanguage) as keyof typeof pageTree
        ];
      }

      return this.pageTree;
    },
    // @ts-expect-error -- ignore this
    generateParams(slug, lang) {
      if (options.i18n) {
        return this.getLanguages().flatMap((entry) =>
          entry.pages.map((page) => ({
            [slug ?? 'slug']: page.slugs,
            [lang ?? 'lang']: entry.language,
          })),
        );
      }

      return this.getPages().map((page) => ({
        [slug ?? 'slug']: page.slugs,
      }));
    },
  };
}

function fileToMeta<Data = MetaData>(file: MetaFile): Meta<Data> {
  return {
    path: file.path,
    absolutePath: file.absolutePath,
    get file() {
      return parseFilePath(this.path);
    },
    data: file.data as Data,
  };
}

function fileToPage<Data = PageData>(
  file: PageFile,
  getUrl: UrlFn,
  locale?: string,
): Page<Data> {
  return {
    get file() {
      return parseFilePath(this.path);
    },
    absolutePath: file.absolutePath,
    path: file.path,
    url: getUrl(file.slugs, locale),
    slugs: file.slugs,
    data: file.data as Data,
    locale,
  };
}

const GroupRegex = /^\(.+\)$/;

function isIndex(file: string) {
  return basename(file, extname(file)) === 'index';
}

/**
 * Convert file path into slugs, also encode non-ASCII characters, so they can work in pathname
 */
export function getSlugs(file: string | FileInfo): string[] {
  if (typeof file !== 'string') return getSlugs(file.path);

  const dir = dirname(file);
  const name = basename(file, extname(file));
  const slugs: string[] = [];

  for (const seg of dir.split('/')) {
    // filter empty names and file groups like (group_name)
    if (seg.length > 0 && !GroupRegex.test(seg)) slugs.push(encodeURI(seg));
  }

  if (GroupRegex.test(name))
    throw new Error(`Cannot use folder group in file names: ${file}`);

  if (name !== 'index') {
    slugs.push(encodeURI(name));
  }

  return slugs;
}
