import type * as PageTree from '@/page-tree/definitions';
import type { I18nConfig } from '@/i18n';
import { buildContentStorage, type ContentStorage } from './storage/content';
import { createPageTreeBuilder, type PageTreeOptions } from '@/source/page-tree/builder';
import { joinPath } from './path';
import { normalizeUrl } from '@/utils/normalize-url';
import { SlugFn, slugsPlugin } from '@/source/plugins/slugs';
import { iconPlugin, type IconResolver } from '@/source/plugins/icon';
import type { MetaData, PageData, Source, SourceConfig } from './source';
import { visit } from '@/page-tree/utils';
import path from 'node:path';
import type { PageTreeTransformer } from '@/source/page-tree/builder';

export interface LoaderConfig {
  source: SourceConfig;
  i18n: I18nConfig | undefined;
}

export interface LoaderOptions<C extends LoaderConfig = LoaderConfig> {
  baseUrl: string;
  i18n?: C['i18n'];
  url?: (slugs: string[], locale?: string) => string;

  /**
   * Additional options for page tree builder
   */
  pageTree?: PageTreeOptions<C>;

  plugins?:
    | LoaderPluginOption[]
    | ((context: {
        typedPlugin: (plugin: LoaderPlugin<C>) => LoaderPlugin;
      }) => LoaderPluginOption[]);
  icon?: IconResolver;
  slugs?: SlugFn<C>;
}

export interface ResolvedLoaderConfig {
  source: Source;
  url: (slugs: string[], locale?: string) => string;

  plugins?: LoaderPlugin[];
  pageTree?: PageTreeOptions;
  i18n?: I18nConfig | undefined;
}

interface SharedFileInfo {
  /**
   * Virtualized file path (relative to content directory)
   *
   * @example `docs/page.mdx`
   */
  path: string;

  /**
   * Absolute path of the file
   */
  absolutePath?: string;
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
  pageTree: Config['i18n'] extends I18nConfig ? Record<string, PageTree.Root> : PageTree.Root;

  getPageTree: (locale?: string) => PageTree.Root;
  /**
   * get referenced page from href, supported:
   *
   * - relative file paths, like `./my/page.mdx`.
   * - generated page pathname, like `/docs/my/page`.
   */
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
   * resolve special hrefs in a page, including:
   *
   * - relative file paths, like `./my/page.mdx`.
   */
  resolveHref: (href: string, parent: Page<Config['source']['pageData']>) => string;

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
   * Get page with slugs, the slugs can also be URI encoded.
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
  generateParams: <TSlug extends string = 'slug', TLang extends string = 'lang'>(
    slug?: TSlug,
    lang?: TLang,
  ) => (Record<TSlug, string[]> & Record<TLang, string>)[];

  /**
   * serialize page tree for non-RSC environments
   */
  serializePageTree: (tree: PageTree.Root) => Promise<object>;
}

function indexPages(storages: Record<string, ContentStorage>, { url }: ResolvedLoaderConfig) {
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
        result.pathToMeta.set(path, {
          path: item.path,
          absolutePath: item.absolutePath,
          data: item.data,
        });
        continue;
      }

      const page: Page = {
        absolutePath: item.absolutePath,
        path: item.path,
        url: url(item.slugs, lang),
        slugs: item.slugs,
        data: item.data,
        locale: lang,
      };
      result.pathToPage.set(path, page);
      result.pages.set(`${lang}.${page.slugs.join('/')}`, page);
    }
  }

  return result;
}

export function createGetUrl(baseUrl: string, i18n?: I18nConfig): ResolvedLoaderConfig['url'] {
  const baseSlugs = baseUrl.split('/');

  return (slugs, locale) => {
    const hideLocale = i18n?.hideLocale ?? 'never';
    let urlLocale: string | undefined;

    if (hideLocale === 'never') {
      urlLocale = locale;
    } else if (hideLocale === 'default-locale' && locale !== i18n?.defaultLanguage) {
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
  options: LoaderOptions<{
    source: NoInfer<Config>;
    i18n: I18n;
  }>,
): LoaderOutput<{
  source: Config;
  i18n: I18n;
}>;

export function loader<
  Config extends SourceConfig,
  I18n extends I18nConfig | undefined = undefined,
>(
  options: LoaderOptions<{
    source: NoInfer<Config>;
    i18n: I18n;
  }> & {
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
  const loaderConfig =
    args.length === 2 ? resolveConfig(args[0], args[1]) : resolveConfig(args[0].source, args[0]);
  const { i18n } = loaderConfig;
  const defaultLanguage = i18n?.defaultLanguage ?? '';
  const storages = buildContentStorage(loaderConfig, defaultLanguage);
  const walker = indexPages(storages, loaderConfig);
  const builder = createPageTreeBuilder(loaderConfig);
  let pageTrees: Record<string, PageTree.Root> | undefined;
  function getPageTrees() {
    return (pageTrees ??= builder.buildI18n(storages));
  }

  return {
    _i18n: i18n,
    get pageTree() {
      const trees = getPageTrees();

      return i18n
        ? (trees as unknown as LoaderOutput<LoaderConfig>['pageTree'])
        : trees[defaultLanguage];
    },
    set pageTree(v) {
      if (i18n) {
        pageTrees = v as unknown as Record<string, PageTree.Root>;
      } else {
        pageTrees ??= {};
        pageTrees[defaultLanguage] = v;
      }
    },
    getPageByHref(href, { dir = '', language = defaultLanguage } = {}) {
      const [value, hash] = href.split('#', 2);
      let target;

      if (value.startsWith('./')) {
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
    resolveHref(href, parent) {
      if (href.startsWith('./')) {
        const target = this.getPageByHref(href, {
          dir: path.dirname(parent.path),
          language: parent.locale,
        });

        if (target) {
          return target.hash ? `${target.page.url}#${target.hash}` : target.page.url;
        }
      }

      return href;
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
    // the slugs plugin generates encoded slugs by default.
    // we can assume page slugs are always URI encoded.
    getPage(slugs = [], language = defaultLanguage) {
      // `slugs` is already decoded
      let page = walker.pages.get(`${language}.${slugs.join('/')}`);
      if (page) return page;

      // `slugs` is URI encoded
      page = walker.pages.get(`${language}.${slugs.map(decodeURI).join('/')}`);
      if (page) return page;
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
    getPageTree(locale = defaultLanguage) {
      const trees = getPageTrees();
      return trees[locale] ?? trees[defaultLanguage];
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
    async serializePageTree(tree: PageTree.Root): Promise<object> {
      const { renderToString } = await import('react-dom/server.edge');

      return visit(tree, (node) => {
        node = { ...node };
        if ('icon' in node && node.icon) {
          node.icon = renderToString(node.icon);
        }
        if (node.name) {
          node.name = renderToString(node.name);
        }
        if ('children' in node) {
          node.children = [...node.children];
        }

        return node;
      });
    },
  };
}

function resolveConfig(
  source: Source,
  { slugs, icon, plugins = [], baseUrl, url, ...base }: LoaderOptions,
): ResolvedLoaderConfig {
  let config: ResolvedLoaderConfig = {
    ...base,
    url: url ? (...args) => normalizeUrl(url(...args)) : createGetUrl(baseUrl, base.i18n),
    source,
    plugins: buildPlugins([
      icon && iconPlugin(icon),
      ...(typeof plugins === 'function'
        ? plugins({
            typedPlugin: (plugin) => plugin as unknown as LoaderPlugin,
          })
        : plugins),
      slugsPlugin(slugs),
    ]),
  };

  for (const plugin of config.plugins ?? []) {
    const result = plugin.config?.(config);
    if (result) config = result;
  }

  return config;
}

export interface LoaderPlugin<Config extends LoaderConfig = LoaderConfig> {
  name?: string;

  /**
   * Change the order of plugin:
   * - `pre`: before normal plugins
   * - `post`: after normal plugins
   */
  enforce?: 'pre' | 'post';

  /**
   * receive & replace loader options
   */
  config?: (config: ResolvedLoaderConfig) => ResolvedLoaderConfig | void | undefined;

  /**
   * transform the storage after loading
   */
  transformStorage?: (context: { storage: ContentStorage<Config['source']> }) => void;

  /**
   * transform the generated page tree
   */
  transformPageTree?: PageTreeTransformer<Config['source']>;
}

export type LoaderPluginOption<Config extends LoaderConfig = LoaderConfig> =
  | LoaderPlugin<Config>
  | LoaderPluginOption<Config>[]
  | undefined;

const priorityMap = {
  pre: 1,
  default: 0,
  post: -1,
};

function buildPlugins(plugins: LoaderPluginOption[], sort = true): LoaderPlugin[] {
  const flatten: LoaderPlugin[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) flatten.push(...buildPlugins(plugin, false));
    else if (plugin) flatten.push(plugin);
  }

  if (sort)
    return flatten.sort(
      (a, b) => priorityMap[b.enforce ?? 'default'] - priorityMap[a.enforce ?? 'default'],
    );
  return flatten;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferPageType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config> ? Page<Config['source']['pageData']> : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferMetaType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config> ? Meta<Config['source']['metaData']> : never;
