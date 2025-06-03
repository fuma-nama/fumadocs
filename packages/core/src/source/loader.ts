import type * as PageTree from '@/server/page-tree';
import type { I18nConfig } from '@/i18n';
import {
  loadFiles,
  loadFilesI18n,
  type LoadOptions,
  type Transformer,
  type VirtualFile,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import {
  type BaseOptions as BasePageTreeBuilderOptions,
  createPageTreeBuilder,
} from './page-tree-builder';
import { type FileInfo } from './path';
import type { MetaFile, PageFile, Storage } from './file-system';
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

  icon?: NonNullable<BasePageTreeBuilderOptions['resolveIcon']>;
  slugs?: LoadOptions['getSlugs'];
  url?: UrlFn;

  source: Source<T>;
  transformers?: Transformer[];

  /**
   * Additional options for page tree builder
   */
  pageTree?: Partial<BasePageTreeBuilderOptions<T['pageData'], T['metaData']>>;

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

export interface Page<Data = PageData> {
  /**
   * Virtualized file path
   */
  file: FileInfo;
  slugs: string[];
  url: string;
  data: Data;

  locale?: string | undefined;
}

export interface Meta<Data = MetaData> {
  /**
   * Virtualized file path
   */
  file: FileInfo;
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
  storages: Record<string, Storage>,
  getUrl: UrlFn,
  i18n?: I18nConfig,
): {
  // (locale.slugs -> page)
  pages: Map<string, Page>;

  getResultFromFile: (file: MetaFile | PageFile) => Page | Meta | undefined;
} {
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const map = new Map<string, Page>();
  const fileMapped = new WeakMap<object, Page | Meta>();

  for (const item of storages[defaultLanguage].list()) {
    if (item.format === 'meta') {
      fileMapped.set(item, fileToMeta(item));
    }

    if (item.format === 'page') {
      const page = fileToPage(item, getUrl, defaultLanguage);
      fileMapped.set(item, page);
      map.set(`${defaultLanguage}.${page.slugs.join('/')}`, page);

      if (!i18n) continue;
      const path = joinPath(item.file.dirname, item.file.name);

      for (const lang of i18n.languages) {
        if (lang === defaultLanguage) continue;
        const localizedItem = storages[lang].read(path, 'page');
        const localizedPage = fileToPage(localizedItem ?? item, getUrl, lang);

        if (localizedItem) {
          fileMapped.set(localizedItem, localizedPage);
        }
        map.set(`${lang}.${localizedPage.slugs.join('/')}`, localizedPage);
      }
    }
  }

  return {
    pages: map,
    getResultFromFile(file) {
      return fileMapped.get(file);
    },
  };
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

/**
 * Convert file path into slugs, also encode non-ASCII characters, so they can work in pathname
 */
export function getSlugs(info: FileInfo): string[] {
  const slugs: string[] = [];

  for (const seg of info.dirname.split('/')) {
    // filter empty names and file groups like (group_name)
    if (seg.length > 0 && !/^\(.+\)$/.test(seg)) slugs.push(encodeURI(seg));
  }

  if (info.name !== 'index') {
    slugs.push(encodeURI(info.name));
  }

  return slugs;
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

  const { source, slugs: slugsFn = getSlugs, i18n } = options;
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const getUrl =
    options.url ?? createGetUrl(options.baseUrl ?? '/', options.i18n);

  const files =
    typeof source.files === 'function' ? source.files() : source.files;
  const storages = i18n
    ? loadFilesI18n(files, {
        i18n: {
          ...i18n,
          parser: i18n.parser ?? 'dot',
        },
        transformers: options.transformers,
        getSlugs: slugsFn,
      })
    : {
        '': loadFiles(files, {
          transformers: options.transformers,
          getSlugs: slugsFn,
        }),
      };

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
      const pages = this.getPages(language);
      const [value, hash] = href.split('#', 2);
      let target;

      if (
        value.startsWith('.') &&
        (value.endsWith('.md') || value.endsWith('.mdx'))
      ) {
        const hrefPath = joinPath(dir, value);
        target = pages.find((item) => item.file.path === hrefPath);
      } else {
        target = pages.find((item) => item.url === value);
      }

      if (!target) return;
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

      const file = storages[language].read(ref, 'meta');
      if (file) return walker.getResultFromFile(file) as Meta;
    },
    getNodePage(node, language = defaultLanguage) {
      const ref = node.$ref?.file;
      if (!ref) return;

      const file = storages[language].read(ref, 'page');
      if (file) return walker.getResultFromFile(file) as Page;
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
    file: file.file,
    data: file.data as Data,
  };
}

function fileToPage<Data = PageData>(
  file: PageFile,
  getUrl: UrlFn,
  locale?: string,
): Page<Data> {
  return {
    file: file.file,
    url: getUrl(file.data.slugs, locale),
    slugs: file.data.slugs,
    data: file.data.data as Data,
    locale,
  };
}
