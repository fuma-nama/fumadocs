import type * as PageTree from '@/server/page-tree';
import {
  loadFiles,
  type LoadOptions,
  type VirtualFile,
  type Transformer,
} from './load-files';
import type { MetaData, PageData, UrlFn } from './types';
import type {
  BuildPageTreeOptions,
  BuildPageTreeOptionsWithI18n,
} from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
import { type FileInfo } from './path';
import type { File, PageFile, Storage } from './file-system';

export interface LoaderConfig {
  source: SourceConfig;
  i18n: boolean;
}

export interface SourceConfig {
  pageData: PageData;
  metaData: MetaData;
}

export interface LoaderOptions
  extends Pick<BuildPageTreeOptionsWithI18n, 'languages' | 'defaultLanguage'> {
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

  files: File[];

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
}

function buildPageMap(
  storage: Storage,
  languages: string[],
  getUrl: UrlFn,
): Map<string, Map<string, Page>> {
  const map = new Map<string, Map<string, Page>>();
  const defaultMap = new Map<string, Page>();

  map.set('', defaultMap);
  for (const file of storage.list()) {
    if (file.format !== 'page' || file.file.locale) continue;
    const page = fileToPage(file, getUrl);

    defaultMap.set(page.slugs.join('/'), page);

    for (const lang of languages) {
      const langMap = map.get(lang) ?? new Map<string, Page>();

      const localized = storage.read(
        `${file.file.flattenedPath}.${lang}`,
        'page',
      );
      const localizedPage = fileToPage(localized ?? file, getUrl, lang);
      langMap.set(localizedPage.slugs.join('/'), localizedPage);
      map.set(lang, langMap);
    }
  }

  return map;
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
  const result = [...info.dirname.split('/'), info.name].filter(
    // filter empty folder names and file groups like (group_name)
    (v) => v.length > 0 && !/^\(.+\)$/.test(v),
  );

  return result[result.length - 1] === 'index' ? result.slice(0, -1) : result;
}

type InferSourceConfig<T> = T extends Source<infer Config> ? Config : never;

export function loader<Options extends LoaderOptions>(
  options: Options,
): LoaderOutput<{
  source: InferSourceConfig<Options['source']>;
  i18n: Options['languages'] extends string[] ? true : false;
}> {
  return createOutput(options) as ReturnType<typeof loader<Options>>;
}

function createOutput({
  source,
  icon: resolveIcon,
  languages,
  rootDir = '',
  transformers,
  baseUrl = '/',
  slugs: slugsFn = getSlugs,
  url: getUrl = createGetUrl(baseUrl),
  defaultLanguage,
  pageTree: pageTreeOptions = {},
}: LoaderOptions): LoaderOutput<LoaderConfig> {
  const storage = loadFiles(
    typeof source.files === 'function' ? source.files(rootDir) : source.files,
    {
      transformers,
      rootDir,
      getSlugs: slugsFn,
    },
  );
  const i18nMap = buildPageMap(storage, languages ?? [], getUrl);
  const builder = createPageTreeBuilder();
  const pageTree =
    languages === undefined
      ? builder.build({
          storage,
          resolveIcon,
          getUrl,
          ...pageTreeOptions,
        })
      : builder.buildI18n({
          languages,
          storage,
          resolveIcon,
          getUrl,
          defaultLanguage,
          ...pageTreeOptions,
        });

  return {
    pageTree: pageTree as LoaderOutput<LoaderConfig>['pageTree'],
    files: storage.list(),
    getPages(language = '') {
      return Array.from(i18nMap.get(language)?.values() ?? []);
    },
    getLanguages() {
      const list: LanguageEntry[] = [];

      for (const [language, pages] of i18nMap) {
        if (language === '') continue;

        list.push({
          language,
          pages: Array.from(pages.values()),
        });
      }

      return list;
    },
    getPage(slugs = [], language = '') {
      return i18nMap.get(language)?.get(slugs.join('/'));
    },
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
