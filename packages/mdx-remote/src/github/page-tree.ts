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
  pageTree: PageTree.Root;
  getPages: () => Page[];
  getPage: (slugs: string[] | undefined) => Page | undefined;
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
  fs: ReturnType<GithubCache['fs']>,
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
          const contentWithFrontmatter = await fs.readFile(file);

          if (!contentWithFrontmatter) return null;

          const { data, content } = matter(contentWithFrontmatter);

          return {
            path: file,
            content,
            frontmatter: data,
          };
        }),
      )
    ).filter(Boolean) as FileInfo[];

    const storage = loadFiles(
      entries.map((e) => ({
        path: e.path,
        type: e.path.endsWith('.json') ? 'meta' : 'page',
        data: {
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

    return {
      pageTree,
      files: entries,
      getPages() {
        return Array.from(pageMap.values());
      },
      getPage(slugs = []) {
        return pageMap.get(slugs.join('/'));
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
