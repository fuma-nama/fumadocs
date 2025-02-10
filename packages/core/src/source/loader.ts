import type * as PageTree from '@/server/page-tree';
import type { I18nConfig } from '@/i18n';
import {
  loadFiles,
  type LoadOptions,
  type VirtualFile,
  type Transformer,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import type { BuildPageTreeOptions } from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
import { type FileInfo } from './path';
import type { MetaFile, PageFile, Storage } from './file-system';

export interface LoaderConfig {
  source: SourceConfig;
  i18n: boolean;
}

export interface SourceConfig {
  pageData: PageData;
  metaData: MetaData;
}

export interface LoaderOptions {
  /**
   * @deprecated It is now recommended to filter files on `source` level
   * @defaultValue `''`
   */
  rootDir?: string;

  baseUrl: string;

  icon?: NonNullable<BuildPageTreeOptions['resolveIcon']>;
  slugs?: LoadOptions['getSlugs'];
  url?: UrlFn;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Inevitable
  source: Source<any>;
  transformers?: Transformer[];

  /**
   * Additional options for page tree builder
   */
  pageTree?: Partial<Omit<BuildPageTreeOptions, 'storage' | 'getUrl'>>;

  /**
   * Configure i18n
   */
  i18n?: I18nConfig;
}

export interface Source<Config extends SourceConfig> {
  /**
   * @internal
   */
  _config?: Config;
  files: VirtualFile[] | ((rootDir: string) => VirtualFile[]);
}

export interface Page<Data = PageData> {
  file: FileInfo;
  slugs: string[];
  url: string;
  data: Data;

  locale?: string | undefined;
}

export interface Meta<Data = MetaData> {
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

  getPageTree(locale?: string): PageTree.Root;

  _i18n?: I18nConfig;

  /**
   * Get list of pages from language, empty if language hasn't specified
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (language?: string) => Page<Config['source']['pageData']>[];

  getLanguages: () => LanguageEntry<Config['source']['pageData']>[];

  /**
   * @param language - If empty, the default language will be used
   */
  getPage: (
    slugs: string[] | undefined,
    language?: string,
  ) => Page<Config['source']['pageData']> | undefined;

  getNodePage: (
    node: PageTree.Item,
  ) => Page<Config['source']['pageData']> | undefined;

  getNodeMeta: (
    node: PageTree.Folder,
  ) => Meta<Config['source']['metaData']> | undefined;

  /**
   * generate static params for Next.js SSG
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
  storage: Storage,
  getUrl: UrlFn,
  i18n?: I18nConfig,
): {
  // (locale.slugs -> page[])
  pages: Map<string, Page>;

  pathToPage: Map<string, Page>;
  pathToMeta: Map<string, Meta>;
} {
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const map = new Map<string, Page>();
  const pages = new Map<string, Page>();
  const metas = new Map<string, Meta>();

  for (const item of storage.list()) {
    if (item.format === 'meta') metas.set(item.file.path, fileToMeta(item));

    if (item.format === 'page') {
      const page = fileToPage(item, getUrl, item.file.locale);
      pages.set(item.file.path, page);

      if (item.file.locale) continue;
      map.set(`${defaultLanguage}.${page.slugs.join('/')}`, page);
      if (!i18n) continue;

      for (const lang of i18n.languages) {
        const localized = storage.read(
          `${item.file.flattenedPath}.${lang}`,
          'page',
        );

        const localizedPage = fileToPage(localized ?? item, getUrl, lang);
        map.set(`${lang}.${localizedPage.slugs.join('/')}`, localizedPage);
      }
    }
  }

  return {
    pages: map,
    pathToPage: pages,
    pathToMeta: metas,
  };
}

export function createGetUrl(baseUrl: string, i18n?: I18nConfig): UrlFn {
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

    const paths = urlLocale
      ? [urlLocale, ...baseUrl.split('/'), ...slugs]
      : [...baseUrl.split('/'), ...slugs];

    return `/${paths.filter((v) => v.length > 0).join('/')}`;
  };
}

export function getSlugs(info: FileInfo): string[] {
  return [...info.dirname.split('/'), info.name].filter(
    // filter empty folder names and file groups like (group_name)
    (v, i, arr) => {
      if (v.length === 0) return false;

      return i === arr.length - 1 ? v !== 'index' : !/^\(.+\)$/.test(v);
    },
  );
}

type InferSourceConfig<T> = T extends Source<infer Config> ? Config : never;

export function loader<Options extends LoaderOptions>(
  options: Options,
): LoaderOutput<{
  source: InferSourceConfig<Options['source']>;
  i18n: Options['i18n'] extends I18nConfig ? true : false;
}> {
  return createOutput(options) as ReturnType<typeof loader<Options>>;
}

function createOutput(options: LoaderOptions): LoaderOutput<LoaderConfig> {
  if (!options.url && !options.baseUrl) {
    console.warn('`loader()` now requires a `baseUrl` option to be defined.');
  }

  const { source, rootDir = '', slugs: slugsFn = getSlugs } = options;
  const getUrl =
    options.url ?? createGetUrl(options.baseUrl ?? '/', options.i18n);

  const storage = loadFiles(
    typeof source.files === 'function' ? source.files(rootDir) : source.files,
    {
      transformers: options.transformers,
      rootDir,
      getSlugs: slugsFn,
    },
  );
  const walker = indexPages(storage, getUrl, options.i18n);
  const builder = createPageTreeBuilder();
  const pageTree =
    options.i18n === undefined
      ? builder.build({
          storage,
          resolveIcon: options.icon,
          getUrl,
          ...options.pageTree,
        })
      : builder.buildI18n({
          storage,
          resolveIcon: options.icon,
          getUrl,
          i18n: options.i18n,
          ...options.pageTree,
        });

  return {
    _i18n: options.i18n,
    pageTree: pageTree as LoaderOutput<LoaderConfig>['pageTree'],
    getPages(language = options.i18n?.defaultLanguage ?? '') {
      const pages: Page[] = [];

      for (const key of walker.pages.keys()) {
        if (key.startsWith(`${language}.`)) pages.push(walker.pages.get(key)!);
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
    getPage(slugs = [], language = options.i18n?.defaultLanguage ?? '') {
      return walker.pages.get(`${language}.${slugs.join('/')}`);
    },
    getNodeMeta(node) {
      if (!node.$ref?.metaFile) return;

      return walker.pathToMeta.get(node.$ref.metaFile);
    },
    getPageTree(locale) {
      if (options.i18n) {
        return pageTree[
          (locale ?? options.i18n.defaultLanguage) as keyof typeof pageTree
        ] as PageTree.Root;
      }

      return pageTree as PageTree.Root;
    },
    getNodePage(node) {
      if (!node.$ref?.file) return;

      return walker.pathToPage.get(node.$ref.file);
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
