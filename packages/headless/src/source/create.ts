import type * as PageTree from '@/server/page-tree';
import {
  load,
  type RawPage,
  type LoadOptions,
  type RawFile,
  type VirtualFile,
} from './load';
import type { MetaData, PageData, Transformer } from './types';
import type { CreatePageTreeBuilderOptions } from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
import { joinPaths } from './path';

interface LoaderConfig {
  source: SourceConfig;
  languages: string[] | undefined;
}

interface SourceConfig {
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
  files: VirtualFile[];
}

export interface LoaderOutput<Config extends LoaderConfig> {
  pageTree: Config['languages'] extends string[]
    ? Record<string, PageTree.Root>
    : PageTree.Root;

  files: RawFile<Config['source']['pageData'], Config['source']['metaData']>[];

  /**
   * Get list of pages from language
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (
    language?: string,
  ) => RawPage<Config['source']['pageData']>[] | undefined;

  /**
   * @param language - If empty, the default language will be used
   */
  getPage: (
    slugs: string[] | undefined,
    language?: string,
  ) => RawPage<Config['source']['pageData']> | undefined;
}

function groupByLanguages(
  files: RawFile[],
  languages: string[],
): Map<string, RawPage[]> {
  const pageMap = new Map<string, RawPage>();

  for (const file of files) {
    if (file.type === 'page') pageMap.set(file.info.flattenedPath, file);
  }

  const langMap = new Map<string, RawPage[]>();

  langMap.set('', []);
  for (const lang of languages) {
    langMap.set(lang, []);
  }

  for (const [key, page] of pageMap) {
    if (page.info.locale) continue;
    langMap.get('')?.push(page);

    for (const lang of languages) {
      const v = pageMap.get(`${key}.${lang}`) ?? page;

      langMap.get(lang)?.push(v);
    }
  }

  return langMap;
}

function createGetUrl(
  baseUrl: string,
): (slugs: string[], locale?: string) => string {
  return (slugs, locale) => {
    const paths = [baseUrl, ...slugs];
    if (locale) paths.push(locale);

    return joinPaths(paths, 'leading');
  };
}

type InferSourceConfig<T> = T extends Source<infer Config> ? Config : never;

export function loader<Options extends LoaderOptions>(
  options: Options,
): LoaderOutput<{
  source: InferSourceConfig<Options['source']>;
  languages: Options['languages'] extends LoaderOptions['languages']
    ? Options['languages']
    : undefined;
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
  slugs = (info) =>
    info.flattenedPath.split('/').filter((s) => !['index'].includes(s)),
  url = createGetUrl(baseUrl),
}: LoaderOptions): LoaderOutput<LoaderConfig> {
  const result = load({
    files: source.files,
    transformers,
    rootDir,
    getSlugs: slugs,
    getUrl: url,
  });
  const i18nMap = groupByLanguages(result.files, languages ?? []);
  const builder = createPageTreeBuilder({
    storage: result.storage,
    resolveIcon: icon,
  });
  const pageTree =
    languages === undefined
      ? builder.build()
      : builder.buildI18n({ languages });

  return {
    pageTree: pageTree as LoaderOutput<LoaderConfig>['pageTree'],
    files: result.files,
    getPages(language = '') {
      return i18nMap.get(language);
    },
    getPage(slugs_ = [], language = '') {
      const path = slugs_.join('/');

      return i18nMap
        .get(language)
        ?.find((page) => page.slugs.join('/') === path);
    },
  };
}
