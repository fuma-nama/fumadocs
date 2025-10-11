import path from 'node:path';
import { remarkConvert } from '@/remark-convert';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import type { Compatible } from 'vfile';
import { remarkObsidianComment } from '@/remark-obsidian-comment';
import { remarkBlockId } from '@/remark-block-id';
import { dump } from 'js-yaml';
import {
  buildStorage,
  type ParsedContentFile,
  type ParsedFile,
  type VaultStorageOptions,
} from '@/build-storage';
import { buildResolver } from '@/build-resolver';
import type { VaultFile } from '@/read-vaults';

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
    .use(remarkConvert, { resolver, storage })
    .use(remarkObsidianComment)
    .use(remarkBlockId);
  const stringifier = unified().use(remarkStringify).use(remarkMdx);

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
    const string = stringifier.stringify(mdast);
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
