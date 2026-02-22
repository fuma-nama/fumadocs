import path from 'node:path';
import { type PluggableList, unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import { VFile } from 'vfile';
import { dump } from 'js-yaml';
import {
  buildStorage,
  type ParsedContentFile,
  type ParsedFile,
  type VaultStorageOptions,
} from '@/build-storage';
import { buildResolver } from '@/build-resolver';
import type { VaultFile } from '@/read-vaults';
import { getRemarkPlugins } from '@/remark';
import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import remarkMath from 'remark-math';

export interface OutputFile {
  type: 'asset' | 'content' | 'data' | 'custom';

  /**
   * paths relative to target folder, for example:
   * - `type: asset` relative to `./public`.
   * - `type: content` relative to `./content/docs`.
   */
  path: string;

  content: string | Buffer<ArrayBufferLike>;
}

export interface ConvertOptions extends VaultStorageOptions {
  /**
   * add extra remark plugins to parse input Markdown files.
   *
   * by default, we include plugins to handle Obsidian-specific syntax, GFM and Maths equations.
   */
  remarkPlugins?: PluggableList;

  /**
   * modify the generated frontmatter data
   */
  transformFrontmatter?: (
    frontmatter: Record<string, unknown>,
    ctx: { file: ParsedFile },
  ) => Record<string, unknown>;
}

declare module 'vfile' {
  interface DataMap {
    source: ParsedContentFile;
  }
}

export async function convertVaultFiles(
  rawFiles: VaultFile[],
  { remarkPlugins = [], transformFrontmatter, ...options }: ConvertOptions = {},
): Promise<OutputFile[]> {
  const storage = buildStorage(rawFiles, options);
  const resolver = buildResolver(storage);
  const output: OutputFile[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkPlugins)
    .use(getRemarkPlugins(storage, resolver));
  const stringifier = processor().use(remarkMdx).use(remarkStringify);

  async function onFile(file: ParsedFile) {
    if (file.format === 'media') {
      output.push({
        type: 'asset',
        path: file.outPath,
        content: file.content,
      });

      return;
    }

    if (file.format === 'data') {
      output.push({
        type: 'data',
        path: file.outPath,
        content: file.content,
      });

      return;
    }

    const vfile = new VFile({
      path: file.path,
      value: file.content,
      data: {
        source: file,
      },
    });

    const mdast = await processor.run(processor.parse(vfile), vfile);
    const string = stringifier.stringify(mdast as Root, vfile);
    let frontmatter: Record<string, unknown> = {
      ...file.frontmatter,
      title: path.basename(file.path, path.extname(file.path)),
    };
    if (transformFrontmatter) frontmatter = transformFrontmatter(frontmatter, { file });

    output.push({
      type: 'content',
      path: file.outPath,
      content: `---\n${dump(frontmatter).trim()}\n---\n${string}`,
    });
  }

  await Promise.all(Array.from(storage.files.values()).map(onFile));
  return output;
}
