import path from 'node:path';
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import type { Compatible } from 'vfile';
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

export interface OutputFile {
  type: 'asset' | 'content' | 'custom';

  /**
   * paths relative to target folder, for example:
   * - `type: asset` relative to `./public`.
   * - `type: content` relative to `./content/docs`.
   */
  path: string;

  content: string | Buffer<ArrayBufferLike>;
}

export type ConvertOptions = VaultStorageOptions;

declare module 'vfile' {
  interface DataMap {
    source: ParsedContentFile;
  }
}

export async function convertVaultFiles(
  rawFiles: VaultFile[],
  options: ConvertOptions = {},
): Promise<OutputFile[]> {
  const storage = buildStorage(rawFiles, options);
  const resolver = buildResolver(storage);
  const output: OutputFile[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
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

    const vfile: Compatible = {
      path: file.path,
      value: String(file.content),
      data: {
        source: file,
      },
    };

    const mdast = await processor.run(processor.parse(vfile), vfile);
    const string = stringifier.stringify(mdast as Root);
    const frontmatter = dump({
      title: path.basename(file.path, path.extname(file.path)),
    }).trim();

    output.push({
      type: 'content',
      path: file.outPath,
      content: `---\n${frontmatter}\n---\n${string}`,
    });
  }

  await Promise.all(Array.from(storage.files.values()).map(onFile));
  return output;
}
