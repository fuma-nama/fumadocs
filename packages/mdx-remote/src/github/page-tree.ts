import path from 'node:path';
import * as fs from 'node:fs/promises';
import { type PageTree } from 'fumadocs-core/server';
import fg from 'fast-glob';
import matter from 'gray-matter';
import {
  createPageTreeBuilder,
  loadFiles,
  getSlugs,
  createGetUrl,
  type BuildPageTreeOptions,
} from 'fumadocs-core/source';

interface FileInfo {
  /**
   * Path relative to directory
   */
  path: string;

  frontmatter: object;
}

interface GeneratePageTreeResult {
  files: {
    /**
     * Path relative to directory
     */
    path: string;

    frontmatter: object;
  }[];

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

/**
 * Generate page tree from **local** file system
 *
 * It's recommended to run this on-demand (e.g. on terminal) to avoid duplicated calculations
 */
export async function generatePageTree({
  include = './**/*.{json,md,mdx}',
  directory,
  baseUrl = '/docs',
  ...options
}: GeneratePageTreeOptions): Promise<GeneratePageTreeResult> {
  const getUrl = createGetUrl(baseUrl);
  const files = await fg(include, {
    cwd: path.resolve(directory),
  });

  const entries: FileInfo[] = await Promise.all(
    files.map(async (file) => {
      const filePath = path.resolve(directory, file);
      const content = await fs.readFile(filePath);
      const { data } = matter(content);

      return {
        path: file,
        frontmatter: data,
      };
    }),
  );

  const storage = loadFiles(
    entries.map((e) => ({
      path: e.path,
      type: e.path.endsWith('.json') ? 'meta' : 'page',
      data: e.frontmatter,
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
    files: entries,
  };
}
