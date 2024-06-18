import type { PageTree, TableOfContents } from 'fumadocs-core/server';
import {
  createPageTreeBuilder,
  loadFiles,
  getSlugs,
  createGetUrl,
  type BuildPageTreeOptions,
} from 'fumadocs-core/source';
import picomatch from 'picomatch';
import { compile } from '..';
import type { GithubCache } from './cache';

interface FileInfo {
  /**
   * Path relative to directory
   */
  path: string;

  data: {
    frontmatter: Record<string, unknown>;
    content: React.ReactElement;
    toc: TableOfContents;
  };
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
          const content = await fs.readFile(file);

          if (!content) return null;

          let data: Record<string, unknown> = {};

          if (['md', 'mdx'].some((ext) => file.endsWith(ext))) {
            const {
              scope: _scope,
              vfile,
              frontmatter,
              ...compiled
            } = await compile({
              source: content,
              // TODO: add support for more configuration
            });

            data = {
              ...frontmatter,
              ...compiled,
              ...vfile.data,
            };
          } else if (file.endsWith('.json')) {
            data = JSON.parse(content) as Record<string, unknown>;
          }

          return {
            path: file,
            data,
          };
        }),
      )
    ).filter(Boolean) as {
      path: string;
      data: NonNullable<unknown>;
    }[];

    const storage = loadFiles(
      entries.map((e) => ({
        path: e.path,
        type: e.path.endsWith('.json') ? 'meta' : 'page',
        data: e.data,
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
