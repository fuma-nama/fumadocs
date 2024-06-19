import type { PageTree } from 'fumadocs-core/server';
import {
  createPageTreeBuilder,
  loadFiles,
  getSlugs,
  createGetUrl,
  type BuildPageTreeOptions,
  type UrlFn,
  type FileData,
} from 'fumadocs-core/source';
import picomatch from 'picomatch';
import matter from 'gray-matter';
import type { createSearchAPI } from 'fumadocs-core/search/server';
import { unstable_cache as nextUnstableCache } from 'next/cache';
import type { GithubCache } from './cache';

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
  /**
   * Path relative to directory
   */
  path: string;

  content: string;

  frontmatter: Record<string, string | undefined>;
}

interface GeneratePageTreeResult {
  files: FileInfo[];
  getPageTree: () => Promise<PageTree.Root>;
  getPages: () => Page[];
  getPage: (slugs: string[] | undefined) => Page | undefined;
  getSearchIndexes: <T extends 'simple' | 'advanced'>(
    type: T,
  ) => Promise<Parameters<typeof createSearchAPI<T>>[1]['indexes']>;
}

interface GeneratePageTreeOptions {
  /**
   * Included files.
   *
   * Includes Markdown, MDX and json files by default
   */
  include?: string | string[];
  directory: string;

  /**
   * @defaultValue '/docs'
   */
  baseUrl?: string;
  pageTree?: Partial<BuildPageTreeOptions>;
}

const builder = createPageTreeBuilder();

export const createGeneratePageTree = (
  revalidationTag: string,
  fs: ReturnType<GithubCache['fs']>,
  compileMDX: GithubCache['compileMDX'],
  {
    include = './**/*.{json,md,mdx}',
  }: Pick<GeneratePageTreeOptions, 'include'>,
) =>
  async function generatePageTree({
    baseUrl = '/docs',
    ...options
  }: Pick<
    GeneratePageTreeOptions,
    'baseUrl' | 'pageTree'
  > = {}): Promise<GeneratePageTreeResult> {
    const getUrl = createGetUrl(baseUrl);
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
            },
      })),
      {
        getSlugs,
      },
    );

    const pageTree = builder.build({
      storage,
      getUrl,
      ...options.pageTree,
    });
    const pageMap = buildPageMap(storage, getUrl);

    const getPageTree = nextUnstableCache(
      (async () => {
        return await new Promise((resolve) => {
          resolve(pageTree);
        });
      }) as GeneratePageTreeResult['getPageTree'],
      undefined,
      {
        tags: [revalidationTag],
      },
    );

    return {
      getPageTree,
      files: entries,
      getPages() {
        return Array.from(pageMap.values());
      },
      getPage(slugs = []) {
        return pageMap.get(slugs.join('/'));
      },
      async getSearchIndexes<T extends 'simple' | 'advanced'>(type: T) {
        const pages = Array.from(pageMap.values());

        if (type === 'simple') {
          return pages.map((page) => ({
            title: page.data.title,
            content: page.data.content,
            url: page.url,
          })) as T extends 'simple'
            ? Parameters<typeof createSearchAPI<T>>[1]['indexes']
            : never;
        }

        return (await Promise.all(
          pages.map(async (page) => {
            const { vfile } = await compileMDX(page.data.content);

            return {
              title: page.data.title,
              structuredData: vfile.data.structuredData,
              id: page.url,
              url: page.url,
            };
          }),
        )) as T extends 'advanced'
          ? Parameters<typeof createSearchAPI<T>>[1]['indexes']
          : never;
      },
    };
  };

function buildPageMap<
  Storage extends {
    list: () => NonNullable<unknown>[];
  },
>(storage: Storage, getUrl: UrlFn): Map<string, Page> {
  const map = new Map<string, Page>();

  for (const file of storage.list() as File[]) {
    if (file.format !== 'page') continue;
    const page = fileToPage(file, getUrl);

    map.set(page.slugs.join('/'), page);
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
