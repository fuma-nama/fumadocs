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
   * @defaultValue `''`
   */
  rootDir?: string;
  /**
   * @defaultValue `'/'`
   */
  baseUrl?: string;

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
  languages: string[] = [],
): {
  // locale -> (slugs -> page[])
  i18n: Map<string, Map<string, Page>>;

  pathToPage: Map<string, Page>;
  pathToMeta: Map<string, Meta>;
} {
  const i18n = new Map<string, Map<string, Page>>();
  const pages = new Map<string, Page>();
  const metas = new Map<string, Meta>();

  const defaultMap = new Map<string, Page>();

  i18n.set('', defaultMap);
  for (const file of storage.list()) {
    if (file.format === 'meta') metas.set(file.file.path, fileToMeta(file));

    if (file.format === 'page') {
      const page = fileToPage(file, getUrl, file.file.locale);
      pages.set(file.file.path, page);

      if (file.file.locale) continue;
      defaultMap.set(page.slugs.join('/'), page);

      for (const lang of languages) {
        const langMap = i18n.get(lang) ?? new Map<string, Page>();

        const localized = storage.read(
          `${file.file.flattenedPath}.${lang}`,
          'page',
        );
        const localizedPage = fileToPage(localized ?? file, getUrl, lang);
        langMap.set(localizedPage.slugs.join('/'), localizedPage);
        i18n.set(lang, langMap);
      }
    }
  }

  return {
    i18n,
    pathToPage: pages,
    pathToMeta: metas,
  };
}

export function createGetUrl(baseUrl: string): UrlFn {
  return (slugs, locale) => {
    const paths = locale
      ? [locale, ...baseUrl.split('/'), ...slugs]
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

function createOutput({
  source,
  icon: resolveIcon,
  rootDir = '',
  transformers,
  baseUrl = '/',
  slugs: slugsFn = getSlugs,
  url: getUrl = createGetUrl(baseUrl),
  pageTree: pageTreeOptions = {},
  i18n,
}: LoaderOptions): LoaderOutput<LoaderConfig> {
  const storage = loadFiles(
    typeof source.files === 'function' ? source.files(rootDir) : source.files,
    {
      transformers,
      rootDir,
      getSlugs: slugsFn,
    },
  );
  const walker = indexPages(storage, getUrl, i18n?.languages);
  const builder = createPageTreeBuilder();
  const pageTree =
    i18n === undefined
      ? builder.build({
          storage,
          resolveIcon,
          getUrl,
          ...pageTreeOptions,
        })
      : builder.buildI18n({
          storage,
          resolveIcon,
          getUrl,
          i18n,
          ...pageTreeOptions,
        });

  return {
    _i18n: i18n,
    pageTree: pageTree as LoaderOutput<LoaderConfig>['pageTree'],
    getPages(language = i18n?.defaultLanguage ?? '') {
      return Array.from(walker.i18n.get(language)?.values() ?? []);
    },
    getLanguages() {
      const list: LanguageEntry[] = [];

      for (const [language, pages] of walker.i18n) {
        if (language === '') continue;

        list.push({
          language,
          pages: Array.from(pages.values()),
        });
      }

      return list;
    },
    getPage(slugs = [], language = i18n?.defaultLanguage ?? '') {
      return walker.i18n.get(language)?.get(slugs.join('/'));
    },
    getNodeMeta(node) {
      if (!node.$ref?.metaFile) return;

      return walker.pathToMeta.get(node.$ref.metaFile);
    },
    getNodePage(node) {
      if (!node.$ref?.file) return;

      return walker.pathToPage.get(node.$ref.file);
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

      return Array.from(walker.i18n.get('')?.values() ?? []).map((page) => ({
        [slug ?? 'slug']: page.slugs,
      }));
    },
  };
}

function fileToMeta<Data = MetaData>(file: MetaFile): Meta<Data> {
  return {
    file: file.file,
    data: file.data.data as Data,
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
  };
}
