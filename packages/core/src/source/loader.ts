import type * as PageTree from '@/server/page-tree';
import type { I18nConfig } from '@/i18n';
import {
  loadFiles,
  type LoadOptions,
  type VirtualFile,
  type Transformer,
  loadFilesI18n,
  type I18nLoadOptions,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import type { BuildPageTreeOptions } from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
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

export interface LoaderOptions {
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
  i18n?: I18nConfig & {
    parser?: I18nLoadOptions['i18n']['parser'];
  };
}

export interface Source<Config extends SourceConfig> {
  /**
   * @internal
   */
  _config?: Config;
  files: VirtualFile[] | (() => VirtualFile[]);
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

  getPageTree: (locale?: string) => PageTree.Root;
  getPageByHref: (
    href: string,
    options?: {
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
  storages: Record<string, Storage>,
  getUrl: UrlFn,
  i18n?: I18nConfig,
): {
  // (locale.slugs -> page)
  pages: Map<string, Page>;

  pathToFile: Map<string, Page | Meta>;
} {
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const map = new Map<string, Page>();
  const pathToFile = new Map<string, Page | Meta>();

  for (const item of storages[defaultLanguage].list()) {
    if (item.format === 'meta')
      pathToFile.set(item.file.path, fileToMeta(item));

    if (item.format === 'page') {
      const page = fileToPage(item, getUrl, defaultLanguage);
      pathToFile.set(item.file.path, page);

      map.set(`${defaultLanguage}.${page.slugs.join('/')}`, page);
      if (!i18n) continue;
      const path = joinPath(item.file.dirname, item.file.name);

      for (const lang of i18n.languages) {
        if (lang === defaultLanguage) continue;

        const localizedPage = fileToPage(
          storages[lang].read(path, 'page') ?? item,
          getUrl,
          lang,
        );
        map.set(`${lang}.${localizedPage.slugs.join('/')}`, localizedPage);
      }
    }
  }

  return {
    pages: map,
    pathToFile,
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

  const { source, slugs: slugsFn = getSlugs } = options;
  const getUrl =
    options.url ?? createGetUrl(options.baseUrl ?? '/', options.i18n);

  const files =
    typeof source.files === 'function' ? source.files() : source.files;
  const storages = options.i18n
    ? loadFilesI18n(files, {
        i18n: {
          ...options.i18n,
          parser: options.i18n.parser ?? 'dot',
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

  const walker = indexPages(storages, getUrl, options.i18n);
  const builder = createPageTreeBuilder();
  let pageTree: LoaderOutput<LoaderConfig>['pageTree'] | undefined;

  return {
    _i18n: options.i18n,
    get pageTree() {
      if (options.i18n) {
        pageTree ??= builder.buildI18n({
          storages,
          resolveIcon: options.icon,
          getUrl,
          i18n: options.i18n,
          ...options.pageTree,
        }) as unknown as LoaderOutput<LoaderConfig>['pageTree'];
      } else {
        pageTree ??= builder.build({
          storage: storages[''],
          resolveIcon: options.icon,
          getUrl,
          ...options.pageTree,
        });
      }

      return pageTree;
    },
    set pageTree(v) {
      pageTree = v;
    },
    getPageByHref(href, { dir = '' } = {}) {
      const pages = Array.from(walker.pages.values());
      const [value, hash] = href.split('#', 2);

      if (
        value.startsWith('.') &&
        (value.endsWith('.md') || value.endsWith('.mdx'))
      ) {
        const hrefPath = joinPath(dir, value);
        const target = pages.find((item) => item.file.path === hrefPath);

        if (target)
          return {
            page: target,
            hash,
          };
      }

      const target = pages.find((item) => item.url === value);
      if (target)
        return {
          page: target,
          hash,
        };
    },
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

      return walker.pathToFile.get(node.$ref.metaFile) as Meta;
    },
    getPageTree(locale) {
      if (options.i18n) {
        return this.pageTree[
          (locale ?? options.i18n.defaultLanguage) as keyof typeof pageTree
        ];
      }

      return this.pageTree;
    },
    getNodePage(node) {
      const ref = node.$ref?.file ?? node.$id;
      if (!ref) return;

      return walker.pathToFile.get(ref) as Page;
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
