import {
  createGetUrl,
  createPageTreeBuilder,
  type FileData,
  getSlugs,
  type LoaderOptions,
  loadFiles,
  type SourceConfig,
  type UrlFn,
} from 'fumadocs-core/source';
import picomatch from 'picomatch';
import matter from 'gray-matter';
import type { createSearchAPI } from 'fumadocs-core/search/server';
import type { GithubCache } from '../types';

interface PageData {
  icon?: string;
  title: string;
  content: string;
}

interface Page<Data = PageData> {
  file: FileInfo;
  slugs: string[];
  url: string;
  data: Data;
}

interface File {
  file: FileInfo;
  format: 'meta' | 'page';
  data: Record<string, unknown>;
}

interface FileInfo {
  locale?: string;
  /**
   * File path without extension
   */
  flattenedPath: string;
  /**
   * File name without locale and extension
   */
  name: string;
  dirname: string;
  /**
   * Path relative to directory
   */
  path: string;

  content: string;

  frontmatter: Record<string, string | undefined>;
}

interface LanguageEntry<Data = PageData> {
  language: string;
  pages: Page<Data>[];
}

type SearchIndexes<T, I18n extends boolean = false> = I18n extends true
  ? (
      | [language: string, indexes: T]
      | {
          language: string;
          indexes: T;
        }
    )[]
  : T;

interface LoaderConfig {
  source: SourceConfig;
  i18n: boolean;
  languages?: string[];
}

interface LoaderOutput<Config extends LoaderConfig> {
  pageTree: Config['i18n'] extends true ? Record<string, Root> : Root;
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
  getSearchIndexes: <T extends 'simple' | 'advanced'>(
    type: T,
  ) => SearchIndexes<
    T extends 'advanced'
      ? Promise<Parameters<typeof createSearchAPI<'advanced'>>[1]['indexes']>
      : Parameters<typeof createSearchAPI<'simple'>>[1]['indexes'],
    Config['i18n']
  >;
}

type Root = ReturnType<(typeof builder)['build']>;

const builder = createPageTreeBuilder();

export const createFumadocsLoader = (
  fs: ReturnType<GithubCache['fs']>,
  compileMDX: GithubCache['compileMDX'],
  {
    include = './**/*.{json,md,mdx}',
    baseUrl = '/docs',
  }: {
    include?: string | string[];
    baseUrl?: string;
  },
) =>
  async function fumadocsLoader<
    Options extends Omit<LoaderOptions, 'source' | 'baseUrl'> | undefined,
  >(
    options?: Options,
  ): Promise<
    LoaderOutput<{
      source: SourceConfig;
      i18n: Options extends { languages: string[] } ? true : false;
    }>
  > {
    const {
      icon: resolveIcon,
      languages,
      rootDir = '',
      transformers,
      slugs: slugsFn = getSlugs,
      url: getUrl = createGetUrl(baseUrl),
      pageTree: pageTreeOptions = {},
    } = options ?? {};

    const isMatch = picomatch(include);
    const files = fs.getFiles().filter((f) => isMatch(f));

    const entries = (
      await Promise.all(
        files.map(async (file) => {
          const raw = await fs.readFile(file);

          if (!raw) return null;

          if (file.endsWith('.json')) {
            return {
              path: file,
              frontmatter: JSON.parse(raw) as Record<
                string,
                string | undefined
              >,
            };
          }
          if (file.endsWith('.md') || file.endsWith('.mdx')) {
            const { data, content } = matter(raw);

            return {
              path: file,
              content,
              frontmatter: data,
            };
          }
        }),
      )
    ).filter(Boolean) as FileInfo[];

    const storage = loadFiles(
      entries.map((e) => ({
        path: e.path,
        type: e.path.endsWith('.json') ? 'meta' : 'page',
        data: e.path.endsWith('.json')
          ? {
              ...e.frontmatter,
            }
          : {
              ...e.frontmatter,
              content: e.content,
              // TODO: add locale, flattenedPath, name, dirname
            },
      })),
      {
        transformers,
        rootDir,
        getSlugs: slugsFn,
      },
    );

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
            ...pageTreeOptions,
          });
    const i18nMap = buildPageMap(storage, languages ?? [], getUrl);

    return {
      pageTree: pageTree as unknown as (
        Options extends { languages: string[] } ? true : false
      ) extends true
        ? Record<string, Root>
        : Root,
      files: storage.list() as unknown as File[],
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
      getSearchIndexes<T extends 'simple' | 'advanced'>(type: T) {
        const langs = languages ?? [];

        if (langs.length === 0) {
          return generateSearchIndexes() as SearchIndexes<
            T extends 'advanced'
              ? Promise<
                  Parameters<typeof createSearchAPI<'advanced'>>[1]['indexes']
                >
              : Parameters<typeof createSearchAPI<'simple'>>[1]['indexes'],
            Options extends { languages: string[] } ? true : false
          >;
        }

        return Promise.all(
          langs.map((lang) => generateSearchIndexes(lang)),
        ) as unknown as SearchIndexes<
          T extends 'advanced'
            ? Promise<
                Parameters<typeof createSearchAPI<'advanced'>>[1]['indexes']
              >
            : Parameters<typeof createSearchAPI<'simple'>>[1]['indexes'],
          Options extends { languages: string[] } ? true : false
        >;

        function generateSearchIndexes(
          language = '',
        ): T extends 'advanced'
          ? Promise<
              Parameters<typeof createSearchAPI<'advanced'>>[1]['indexes']
            >
          : Parameters<typeof createSearchAPI<'simple'>>[1]['indexes'] {
          const pages = Array.from(i18nMap.get(language)?.values() ?? []);

          if (type === 'simple') {
            return pages.map((page) => ({
              title: page.data.title,
              content: page.data.content,
              url: page.url,
            })) as T extends 'advanced'
              ? never
              : Parameters<typeof createSearchAPI<'simple'>>[1]['indexes'];
          }

          return Promise.all(
            pages.map(async (page) => {
              const { vfile } = await compileMDX(page.data.content);

              return {
                title: page.data.title,
                structuredData: vfile.data.structuredData,
                id: page.url,
                url: page.url,
              };
            }),
          ) as T extends 'advanced'
            ? Promise<
                Parameters<typeof createSearchAPI<'advanced'>>[1]['indexes']
              >
            : never;
        }
      },
    };
  };

function buildPageMap(
  storage: ReturnType<typeof loadFiles>,
  languages: string[],
  getUrl: UrlFn,
): Map<string, Map<string, Page>> {
  const map = new Map<string, Map<string, Page>>();
  const defaultMap = new Map<string, Page>();

  map.set('', defaultMap);
  for (const file of storage.list() as unknown as File[]) {
    if (file.format !== 'page' || file.file.locale) continue;
    const page = fileToPage(file, getUrl);

    defaultMap.set(page.slugs.join('/'), page);

    for (const lang of languages) {
      const langMap = map.get(lang) ?? new Map<string, Page>();

      const localized = storage.read(
        `${file.file.flattenedPath}.${lang}`,
        'page',
      ) as File | undefined;
      const localizedPage = fileToPage(localized ?? file, getUrl, lang);
      langMap.set(localizedPage.slugs.join('/'), localizedPage);
      map.set(lang, langMap);
    }
  }

  return map;
}

function fileToPage<Data = PageData>(
  file: File,
  getUrl: UrlFn,
  locale?: string,
): Page<Data> {
  const data = file.data as FileData['file'];

  return {
    file: file.file,
    url: getUrl(data.slugs, locale),
    slugs: data.slugs,
    data: data.data as Data,
  };
}
