import type * as PageTree from '@/page-tree/definitions';
import type { I18nConfig } from '@/i18n';
import {
  buildContentStorage,
  type ContentStorage,
  type MetaFile,
  type PageFile,
} from './storage/content';
import type {
  MetaData,
  PageData,
  UrlFn,
  VirtualFile,
  VirtualMeta,
  VirtualPage,
} from './types';
import {
  createPageTreeBuilder,
  type PageTreeOptions,
} from '@/source/page-tree/builder';
import { joinPath } from './path';
import { normalizeUrl } from '@/utils/normalize-url';
import { buildPlugins, type LoaderPlugin } from '@/source/plugins';
import { slugsPlugin } from '@/source/plugins/slugs';
import { iconPlugin, type IconResolver } from '@/source/plugins/icon';

export interface LoaderConfig {
  source: SourceConfig;
  i18n: I18nConfig | undefined;
}

export interface SourceConfig {
  pageData: PageData;
  metaData: MetaData;
}

export interface LoaderOptions<
  S extends SourceConfig = SourceConfig,
  I18n extends I18nConfig | undefined = I18nConfig | undefined,
> {
  baseUrl: string;
  i18n?: I18n;
  url?: UrlFn;

  /**
   * Additional options for page tree builder
   */
  pageTree?: PageTreeOptions<S['pageData'], S['metaData']>;

  plugins?: (
    | LoaderPlugin<S['pageData'], S['metaData']>
    | LoaderPlugin<S['pageData'], S['metaData']>[]
    | undefined
  )[];

  icon?: IconResolver;
  slugs?: (info: { path: string }) => string[];
}

export interface ResolvedLoaderConfig {
  source: Source;
  url: UrlFn;

  plugins?: LoaderPlugin[];
  pageTree?: PageTreeOptions;
  i18n?: I18nConfig | undefined;
}

export interface Source<Config extends SourceConfig = SourceConfig> {
  files: VirtualFile<Config>[];
}

interface SharedFileInfo {
  /**
   * Virtualized file path (relative to content directory)
   *
   * @example `docs/page.mdx`
   */
  path: string;

  /**
   * Absolute path of the file (can be empty)
   */
  absolutePath: string;
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

  /**
   * @internal
   */
  _i18n?: I18nConfig;

  /**
   * Get a list of pages from specified language
   *
   * @param language - If empty, list pages from all languages.
   */
  getPages: (language?: string) => Page<Config['source']['pageData']>[];

  /**
   * get each language and its pages, empty if i18n is not enabled.
   */
  getLanguages: () => {
    language: string;
    pages: Page<Config['source']['pageData']>[];
  }[];

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
  source: Source<Config>,
  options: LoaderOptions<NoInfer<Config>, I18n>,
): LoaderOutput<{
  source: Config;
  i18n: I18n;
}>;

export function loader<
  Config extends SourceConfig,
  I18n extends I18nConfig | undefined = undefined,
>(
  options: LoaderOptions<NoInfer<Config>, I18n> & {
    source: Source<Config>;
  },
): LoaderOutput<{
  source: Config;
  i18n: I18n;
}>;

export function loader(
  ...args:
    | [
        LoaderOptions & {
          source: Source;
        },
      ]
    | [Source, LoaderOptions]
): LoaderOutput<LoaderConfig> {
  const resolved =
    args.length === 2
      ? resolveConfig(args[0], args[1])
      : resolveConfig(args[0].source, args[0]);

  return createOutput(resolved);
}

function resolveConfig(
  source: Source,
  { slugs, icon, plugins = [], baseUrl, url, ...base }: LoaderOptions,
): ResolvedLoaderConfig {
  const getUrl: UrlFn = url
    ? (...args) => normalizeUrl(url(...args))
    : createGetUrl(baseUrl, base.i18n);

  let config: ResolvedLoaderConfig = {
    ...base,
    url: getUrl,
    source,
    plugins: buildPlugins([
      slugsPlugin(slugs),
      icon && iconPlugin(icon),
      ...plugins,
    ]),
  };

  for (const plugin of config.plugins ?? []) {
    const result = plugin.config?.(config);
    if (result) config = result;
  }

  return config;
}

function createOutput({
  source: { files },
  url: getUrl,
  i18n,
  plugins = [],
  pageTree: pageTreeConfig,
}: ResolvedLoaderConfig): LoaderOutput<LoaderConfig> {
  const defaultLanguage = i18n?.defaultLanguage ?? '';

  const storages = buildContentStorage(
    files,
    (file) => {
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
    plugins,
    i18n ?? {
      defaultLanguage,
      parser: 'none',
      languages: [defaultLanguage],
    },
  );

  const walker = indexPages(storages, getUrl);
  const builder = createPageTreeBuilder(getUrl, plugins);
  let pageTree: Record<string, PageTree.Root> | undefined;

  return {
    _i18n: i18n,
    get pageTree() {
      pageTree ??= builder.buildI18n(storages, pageTreeConfig);

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
    getPageByHref(href, { dir = '', language = defaultLanguage } = {}) {
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
    getPages(language) {
      const pages: Page[] = [];

      for (const [key, value] of walker.pages.entries()) {
        if (language === undefined || key.startsWith(`${language}.`)) {
          pages.push(value);
        }
      }

      return pages;
    },
    getLanguages() {
      const list: {
        language: string;
        pages: Page[];
      }[] = [];

      if (!i18n) return list;
      for (const language of i18n.languages) {
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
      if (i18n) {
        return this.pageTree[
          (locale ?? defaultLanguage) as keyof typeof pageTree
        ];
      }

      return this.pageTree;
    },
    // @ts-expect-error -- ignore this
    generateParams(slug, lang) {
      if (i18n) {
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
    data: file.data as Data,
  };
}

function fileToPage<Data = PageData>(
  file: PageFile,
  getUrl: UrlFn,
  locale?: string,
): Page<Data> {
  return {
    absolutePath: file.absolutePath,
    path: file.path,
    url: getUrl(file.slugs, locale),
    slugs: file.slugs,
    data: file.data as Data,
    locale,
  };
}

export type _ConfigUnion_<T extends Record<string, Source>> = {
  [K in keyof T]: T[K] extends Source<infer Config>
    ? {
        pageData: Config['pageData'] & { type: K };
        metaData: Config['metaData'] & { type: K };
      }
    : never;
}[keyof T];

export function multiple<T extends Record<string, Source>>(sources: T) {
  const out: Source<_ConfigUnion_<T>> = { files: [] };

  for (const [type, source] of Object.entries(sources)) {
    for (const file of source.files) {
      out.files.push({
        ...file,
        data: {
          ...file.data,
          type,
        },
      });
    }
  }

  return out;
}

/**
 * map virtual files in source
 */
export function map<Config extends SourceConfig>(source: Source<Config>) {
  return {
    page<$Page extends PageData>(
      fn: (entry: VirtualPage<Config['pageData']>) => VirtualPage<$Page>,
    ): Source<{
      pageData: $Page;
      metaData: Config['metaData'];
    }> {
      return {
        files: source.files.map((file) =>
          file.type === 'page' ? fn(file) : file,
        ),
      };
    },
    meta<$Meta extends MetaData>(
      fn: (entry: VirtualMeta<Config['metaData']>) => VirtualMeta<$Meta>,
    ): Source<{
      pageData: Config['pageData'];
      metaData: $Meta;
    }> {
      return {
        files: source.files.map((file) =>
          file.type === 'meta' ? fn(file) : file,
        ),
      };
    },
  };
}
