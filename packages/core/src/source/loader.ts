import type * as PageTree from '@/server/page-tree';
import {
  loadFiles,
  type LoadOptions,
  type VirtualFile,
  type Transformer,
} from './load-files';
import type { FileData, MetaData, PageData } from './types';
import type { CreatePageTreeBuilderOptions } from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
import { joinPaths, splitPath, type FileInfo } from './path';
import type { File, Storage } from './file-system';

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
  languages?: string[];
  icon?: NonNullable<CreatePageTreeBuilderOptions['resolveIcon']>;
  slugs?: LoadOptions['getSlugs'];
  url?: LoadOptions['getUrl'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Inevitable
  source: Source<any>;
  transformers?: Transformer[];
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
): Map<string, Map<string, Page>> {
  const map = new Map<string, Map<string, Page>>();
  const defaultMap = new Map<string, Page>();

  map.set('', defaultMap);
  for (const file of storage.list()) {
    if (file.format !== 'page' || file.file.locale) continue;
    const page = fileToPage(file);

    defaultMap.set(page.slugs.join('/'), page);

    for (const lang of languages) {
      const langMap = map.get(lang) ?? new Map<string, Page>();

      const localized = storage.read(
        `${file.file.flattenedPath}.${lang}`,
        'page',
      );
      const localizedPage = localized ? fileToPage(localized) : page;
      langMap.set(localizedPage.slugs.join('/'), localizedPage);
      map.set(lang, langMap);
    }
  }

  return map;
}

export function createGetUrl(
  baseUrl: string,
): (slugs: string[], locale?: string) => string {
  return (slugs, locale) => {
    let paths = [baseUrl, ...slugs];
    if (locale) paths = [baseUrl, locale, ...slugs];

    return joinPaths(paths, 'leading');
  };
}

export function getSlugs(info: FileInfo): string[] {
  const result = [...splitPath(info.dirname), info.name];

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
  icon,
  languages,
  rootDir = '',
  transformers,
  baseUrl = '/',
  slugs: slugsFn = getSlugs,
  url: urlFn = createGetUrl(baseUrl),
}: LoaderOptions): LoaderOutput<LoaderConfig> {
  const storage = loadFiles(
    typeof source.files === 'function' ? source.files(rootDir) : source.files,
    {
      transformers,
      rootDir,
      getSlugs: slugsFn,
      getUrl: urlFn,
    },
  );
  const i18nMap = buildPageMap(storage, languages ?? []);
  const builder = createPageTreeBuilder({
    storage,
    resolveIcon: icon,
  });
  const pageTree =
    languages === undefined
      ? builder.build()
      : builder.buildI18n({ languages });

  return {
    pageTree: pageTree as LoaderOutput<LoaderConfig>['pageTree'],
    files: storage.list(),
    getPages(language = '') {
      return Array.from(i18nMap.get(language)?.values() ?? []);
    },
    getPage(slugs = [], language = '') {
      return i18nMap.get(language)?.get(slugs.join('/'));
    },
  };
}

function fileToPage<Data = PageData>(file: File): Page<Data> {
  const data = file.data as FileData['file'];

  return {
    file: file.file,
    url: data.url,
    slugs: data.slugs,
    data: data.data as Data,
  };
}
