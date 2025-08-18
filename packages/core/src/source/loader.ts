import type * as PageTree from '@/server/page-tree';
import type { I18nConfig } from '@/i18n';
import {
  type ContentStorage,
  loadFiles,
  type MetaFile,
  type PageFile,
  type Transformer,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import {
  type BuildPageTreeOptions,
  createPageTreeBuilder,
} from './page-tree-builder';
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
  i18n: boolean;
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

  icon?: NonNullable<BuildPageTreeOptions['resolveIcon']>;
  slugs?: (info: FileInfo) => string[];
  url?: UrlFn;

  source: Source<T>;
  transformers?: Transformer[];

  /**
   * Additional options for page tree builder
   */
  pageTree?: Partial<
    Omit<BuildPageTreeOptions<T['pageData'], T['metaData']>, 'storage'>
  >;

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
  pageTree: Config['i18n'] extends true
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

function indexPages(
  storages: Record<string, ContentStorage>,
  getUrl: UrlFn,
  i18n?: I18nConfig,
) {
  const result = {
    // (locale.slugs -> page)
    pages: new Map<string, Page>(),
    // (locale.path -> page)
    pathToMeta: new Map<string, Meta>(),
    // (locale.path -> meta)
    pathToPage: new Map<string, Page>(),
  };

  const defaultLanguage = i18n?.defaultLanguage ?? '';

  for (const filePath of storages[defaultLanguage].getFiles()) {
    const item = storages[defaultLanguage].read(filePath)!;
    const path = `${defaultLanguage}.${filePath}`;

    if (item.format === 'meta') {
      result.pathToMeta.set(path, fileToMeta(item));
    }

    if (item.format === 'page') {
      const page = fileToPage(item, getUrl, defaultLanguage);
      result.pathToPage.set(path, page);
      result.pages.set(`${defaultLanguage}.${page.slugs.join('/')}`, page);

      if (!i18n) continue;

      for (const lang of i18n.languages) {
        if (lang === defaultLanguage) continue;
        const localizedItem = storages[lang].read(filePath);
        const localizedPage = fileToPage(
          localizedItem?.format === 'page' ? localizedItem : item,
          getUrl,
          lang,
        );

        if (localizedItem) {
          result.pathToPage.set(`${lang}.${filePath}`, localizedPage);
        }

        result.pages.set(
          `${lang}.${localizedPage.slugs.join('/')}`,
          localizedPage,
        );
      }
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
  i18n: I18n extends I18nConfig ? true : false;
}> {
  // @ts-expect-error -- forced type cast
  return createOutput(options);
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
  const files =
    typeof source.files === 'function' ? source.files() : source.files;

  const transformerSlugs: Transformer = ({ storage }) => {
    const indexFiles = new Set<string>();
    const taken = new Set<string>();

    for (const path of storage.getFiles()) {
      const file = storage.read(path);
      if (!file || file.format !== 'page' || file.slugs) continue;

      // for custom slugs function, don't handle conflicting cases like `dir/index.mdx` vs `dir.mdx`
      if (isIndex(path) && !slugsFn) {
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
    i18n
      ? {
          ...i18n,
          parser: i18n.parser ?? 'dot',
        }
      : {
          defaultLanguage,
          parser: 'none',
          languages: [defaultLanguage],
        },
  );

  const walker = indexPages(storages, getUrl, i18n);
  const builder = createPageTreeBuilder(getUrl);
  let pageTree: LoaderOutput<LoaderConfig>['pageTree'] | undefined;

  return {
    _i18n: i18n,
    get pageTree() {
      if (i18n) {
        pageTree ??= builder.buildI18n({
          storages,
          resolveIcon: options.icon,
          i18n: i18n,
          ...options.pageTree,
        }) as unknown as LoaderOutput<LoaderConfig>['pageTree'];
      } else {
        pageTree ??= builder.build({
          storage: storages[''],
          resolveIcon: options.icon,
          ...options.pageTree,
        });
      }

      return pageTree;
    },
    set pageTree(v) {
      pageTree = v;
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
