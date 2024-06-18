import type { PageTree } from 'fumadocs-core/server';
import {
  createPageTreeBuilder,
  loadFiles,
  getSlugs,
  createGetUrl,
  type BuildPageTreeOptions,
} from 'fumadocs-core/source';
import picomatch from 'picomatch';
import matter from 'gray-matter';
import type { GithubCache } from './cache';

interface FileInfo {
  /**
   * Path relative to directory
   */
  path: string;

  frontmatter: object;

  content: string;
}

interface GeneratePageTreeResult {
  files: FileInfo[];
  pageTree: PageTree.Root;
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
  fs: GithubCache['fs'],
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
            frontmatter: data,
            content,
          } satisfies FileInfo;
        }),
      )
    ).filter(Boolean) as FileInfo[];

    const storage = loadFiles(
      entries.map(({ path, ...data }) => ({
        path,
        type: path.endsWith('.json') ? 'meta' : 'page',
        data,
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

    return {
      pageTree,
      files: entries as unknown as FileInfo[],
    };
  };
