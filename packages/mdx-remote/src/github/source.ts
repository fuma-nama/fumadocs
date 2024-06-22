import {
  type BuildPageTreeOptions,
  createGetUrl,
  createPageTreeBuilder,
  type FileData,
  type FileInfo,
  type FileSystem,
  getSlugs,
  loadFiles,
  type LoadOptions,
  parseFilePath,
  type Transformer,
  type UrlFn,
  type VirtualFile,
} from 'fumadocs-core/source';
import picomatch from 'picomatch';
import matter from 'gray-matter';
import { type CompileMDXResult } from '@/processor';
import type { VirtualFileSystem } from '@/github/create/file-system';
import { compileMDX, type CompileMDXOptions } from '@/compile';
import type { PageTree } from 'fumadocs-core/server';
import { GlobalCache } from '@/github/types';

type DefaultFrontmatter = {
  icon?: string;
  title: string;
  content: string;
};

interface Page<
  Frontmatter extends Record<string, unknown> = DefaultFrontmatter,
> {
  file: FileInfo;
  frontmatter: Frontmatter;

  compile: (
    options?: Omit<CompileMDXOptions, 'source'>,
  ) => Promise<CompileMDXResult<Frontmatter>>;
  slugs: string[];
  url: string;
}

interface LanguageEntry<
  Frontmatter extends Record<string, unknown> = DefaultFrontmatter,
> {
  language: string;
  pages: Page<Frontmatter>[];
}

interface LoaderOutput<
  Frontmatter extends Record<string, unknown> = DefaultFrontmatter,
> {
  getPageTree(local?: string): Promise<PageTree.Root>;

  /**
   * Get list of pages from language, empty if language hasn't specified
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (language?: string) => Promise<Page<Frontmatter>[]>;

  getLanguages: () => Promise<LanguageEntry<Frontmatter>[]>;

  /**
   * @param language - If empty, the default language will be used
   */
  getPage: (
    slugs: string[] | undefined,
    language?: string,
  ) => Promise<Page<Frontmatter> | undefined>;
}

const builder = createPageTreeBuilder();

export interface LoaderOptions {
  languages?: string[];

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
  transformers?: Transformer[];
  /**
   * Additional options for page tree builder
   */
  pageTree?: Partial<Omit<BuildPageTreeOptions, 'storage' | 'getUrl'>>;
}

export async function loader<
  Frontmatter extends Record<string, unknown> = DefaultFrontmatter,
>(
  cache: GlobalCache,
  options: LoaderOptions = {},
): Promise<LoaderOutput<Frontmatter>> {
  const {
    icon: resolveIcon,
    languages,
    rootDir = '',
    baseUrl = '/',
    transformers,
    slugs: slugsFn = getSlugs,
    url: getUrl = createGetUrl(baseUrl),
    pageTree: pageTreeOptions = {},
  } = options ?? {};

  const isMatch = picomatch(cache._options.include);

  await cache.load();
  async function getStorage() {
    const fs = cache.getFileSystem();
    const files = fs.getFiles().filter((f) => isMatch(f));
    const virtualFiles = await resolveFiles(files, fs);

    return loadFiles(virtualFiles, {
      transformers,
      rootDir,
      getSlugs: slugsFn,
    });
  }
  const storage = getStorage();

  async function getI18nMap() {
    return buildPageMap(await storage, languages ?? [], {
      getUrl,
      fs: cache.getFileSystem(),
    }) as unknown as Map<string, Map<string, Page<Frontmatter>>>;
  }
  const i18nMap = getI18nMap();

  let pageTree: Record<string, PageTree.Root>;

  return {
    async getPageTree(local = 'default') {
      if (!pageTree) {
        if (languages === undefined) {
          pageTree = {};
          pageTree.default = builder.build({
            storage: await storage,
            resolveIcon,
            getUrl,
            ...pageTreeOptions,
          });
        } else {
          pageTree = builder.buildI18n({
            languages,
            storage: await storage,
            resolveIcon,
            getUrl,
            ...pageTreeOptions,
          });
        }
      }

      return pageTree[local];
    },
    async getPages(language = '') {
      return Array.from((await i18nMap).get(language)?.values() ?? []);
    },
    async getLanguages() {
      const list: LanguageEntry<Frontmatter>[] = [];

      for (const [language, pages] of await i18nMap) {
        if (language === '') continue;

        list.push({
          language,
          pages: Array.from(pages.values()),
        });
      }

      return list;
    },
    async getPage(slugs = [], language = '') {
      return (await i18nMap).get(language)?.get(slugs.join('/'));
    },
  };
}

function buildPageMap(
  storage: ReturnType<typeof loadFiles>,
  languages: string[],
  ctx: Context,
): Map<string, Map<string, Page>> {
  const map = new Map<string, Map<string, Page>>();
  const defaultMap = new Map<string, Page>();

  map.set('', defaultMap);
  for (const file of storage.list()) {
    if (file.format !== 'page' || file.file.locale) continue;
    const page = fileToPage(file, ctx);

    defaultMap.set(page.slugs.join('/'), page);

    for (const lang of languages) {
      const langMap = map.get(lang) ?? new Map();

      const localized = storage.read(
        `${file.file.flattenedPath}.${lang}`,
        'page',
      );
      const localizedPage = fileToPage(localized ?? file, ctx, lang);

      langMap.set(localizedPage.slugs.join('/'), localizedPage);
      map.set(lang, langMap);
    }
  }

  return map;
}

async function resolveFiles(
  files: string[],
  fs: VirtualFileSystem,
): Promise<VirtualFile[]> {
  const resolved = await Promise.all(
    files.map<Promise<VirtualFile | false>>(async (file) => {
      const raw = await fs.readFile(file);

      if (!raw) return false;

      if (file.endsWith('.json')) {
        return {
          type: 'meta',
          path: file,
          data: JSON.parse(raw),
        };
      }

      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const { data } = matter(raw);

        return {
          type: 'page',
          path: file,
          data: {
            slugs: getSlugs(parseFilePath(file)),
            ...data,
          },
        };
      }

      return false;
    }),
  );

  return resolved.filter(Boolean) as VirtualFile[];
}

interface Context {
  fs: VirtualFileSystem;
  getUrl: UrlFn;
}

function fileToPage(
  file: FileSystem.File,
  ctx: Context,
  locale?: string,
): Page {
  const data = file.data as FileData['file'];

  return {
    frontmatter: data.data as DefaultFrontmatter,
    url: ctx.getUrl(data.slugs, locale),
    slugs: data.slugs,
    file: file.file,
    async compile(options = {}) {
      const content = await ctx.fs.readFile(file.file.path);
      if (!content) throw new Error(`File not found: ${file.file.path}`);

      return compileMDX({
        source: content,
        ...options,
      });
    },
  };
}
