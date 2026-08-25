import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { mdxToMarkdown } from 'mdast-util-mdx';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remark } from 'remark';
import { getSlugs } from 'fumadocs-core/source';
import type { ModuleInterface } from './generated';
import { buildPages, type BuiltPage } from './build';
import type { PythonGroupBy } from './source';

export interface ConvertOptions {
  /** base URL of the generated pages, used to link classes and modules from their parent module */
  baseUrl?: string;
  /**
   * group generated pages in a directory:
   *
   * - `module`: the name of the root module
   * - `none`: place them at the root of the output directory
   *
   * @defaultValue 'module'
   */
  groupBy?: PythonGroupBy;
}

export interface OutputFile {
  /** relative to the output directory, e.g. `httpx/_client/index.mdx` */
  path: string;
  title: string;
  /** MDX content, without frontmatter */
  content: string;
}

const stringifier = remark()
  .use(remarkGfm)
  .use(function () {
    (this.data().toMarkdownExtensions ??= []).push(mdxToMarkdown());
  });

/** Convert a module into MDX files, one per module and class. */
export function convert(mod: ModuleInterface, options: ConvertOptions = {}): OutputFile[] {
  const { baseUrl = '/' } = options;
  const href = (target: BuiltPage) =>
    '/' + [...baseUrl.split('/'), ...getSlugs(target.path)].filter(Boolean).join('/');

  return buildPages(mod, options.groupBy).map((page) => ({
    path: page.path,
    title: page.title,
    content: stringifier.stringify(page.build(href)),
  }));
}

/** Write the converted files into your content directory. */
export async function write(files: OutputFile[], outDir = './'): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const filePath = path.resolve(outDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        `---\ntitle: ${JSON.stringify(file.title)}\n---\n\n${file.content}`,
      );
    }),
  );
}
