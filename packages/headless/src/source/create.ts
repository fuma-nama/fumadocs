import type * as PageTree from '@/server/page-tree';
import { load, type LoadOptions, type VirtualFile } from './load';
import type { MetaData, PageData, Transformer } from './types';
import type { CreatePageTreeBuilderOptions } from './page-tree-builder';
import { createPageTreeBuilder } from './page-tree-builder';
import { joinPaths } from './path';
import type { Node, Page } from './file-system';

interface LoaderConfig {
  source: SourceConfig;
  i18n: boolean;
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
  files: VirtualFile[] | ((rootDir: string) => VirtualFile[]);
}

export interface LoaderOutput<Config extends LoaderConfig> {
  pageTree: Config['i18n'] extends true
    ? Record<string, PageTree.Root>
    : PageTree.Root;

  files: Node<Config['source']['metaData'], Config['source']['pageData']>[];

  /**
   * Get list of pages from language
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (
    language?: string,
  ) => Page<Config['source']['pageData']>[] | undefined;

  /**
   * @param language - If empty, the default language will be used
   */
  getPage: (
    slugs: string[] | undefined,
    language?: string,
  ) => Page<Config['source']['pageData']> | undefined;
}

function groupByLanguages(
  nodes: Node[],
  languages: string[],
): Map<string, Page[]> {
  const pageMap = new Map<string, Page>();

  for (const node of nodes) {
    if (node.type === 'page') pageMap.set(node.file.flattenedPath, node);
  }

  const langMap = new Map<string, Page[]>();

  langMap.set('', []);
  for (const lang of languages) {
    langMap.set(lang, []);
  }

  for (const [key, node] of pageMap) {
    if (node.file.locale) continue;
    langMap.get('')?.push(node);

    for (const lang of languages) {
      const v = pageMap.get(`${key}.${lang}`) ?? node;

      langMap.get(lang)?.push(v);
    }
  }

  return langMap;
}

function createGetUrl(
  baseUrl: string,
): (slugs: string[], locale?: string) => string {
  return (slugs, locale) => {
    let paths = [baseUrl, ...slugs];
    if (locale) paths = [baseUrl, locale, ...slugs];

    return joinPaths(paths, 'leading');
  };
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
  slugs = (info) => {
    const result = [...info.dirname.split('/'), info.name].filter(Boolean);
    return result[result.length - 1] === 'index' ? result.slice(0, -1) : result;
  },
  url = createGetUrl(baseUrl),
}: LoaderOptions): LoaderOutput<LoaderConfig> {
  const result = load({
    files:
      typeof source.files === 'function' ? source.files(rootDir) : source.files,
    transformers,
    rootDir,
    getSlugs: slugs,
    getUrl: url,
  });
  const i18nMap = groupByLanguages(result.storage.list(), languages ?? []);
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
    files: result.storage.list(),
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
