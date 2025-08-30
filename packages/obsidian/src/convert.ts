import path from 'node:path';
import { remarkConvert } from '@/remark-convert';
import matter from 'gray-matter';
import { stash } from '@/utils/stash';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import type { Compatible } from 'vfile';
import { type Frontmatter, frontmatterSchema } from '@/utils/schema';
import { remarkObsidianComment } from '@/remark-obsidian-comment';
import { remarkBlockId } from '@/remark-block-id';
import { dump } from 'js-yaml';

type RenameOutputFn = (originalOutputPath: string, file: VaultFile) => string;

export interface VaultFile {
  /**
   * paths relative to vault folder
   */
  path: string;

  content: string | Buffer<ArrayBufferLike>;
}

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

export interface ConvertOptions {
  /**
   * generate URL from media file
   */
  url?: (outputPath: string, mediaFile: VaultFile) => string;

  outputPath?: RenameOutputFn | RenameOutputPreset;
}

export type ParsedFile = ParsedContentFile | ParsedMediaFile;

export interface ParsedContentFile {
  format: 'content';
  frontmatter: Frontmatter;
  path: string;

  // output path (relative to content directory)
  outPath: string;
  content: string;
}

export interface ParsedMediaFile {
  format: 'media';
  path: string;

  // output path (relative to asset directory)
  outPath: string;
  url: string;
  content: VaultFile['content'];
}

declare module 'vfile' {
  interface DataMap {
    source: ParsedContentFile;
  }
}

export interface InternalContext {
  /**
   * get files by full file path
   */
  storage: Map<string, ParsedFile>;
}

function normalize(filePath: string): string {
  filePath = stash(filePath);
  if (filePath.startsWith('../'))
    throw new Error(`${filePath} points outside of vault folder`);

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}

export async function convertVaultFiles(
  rawFiles: VaultFile[],
  options: ConvertOptions = {},
): Promise<OutputFile[]> {
  const {
    url = (file) => {
      const segs = normalize(file)
        .split('/')
        .filter((v) => v.length > 0);
      return `/${segs.join('/')}`;
    },
  } = options;
  const outputPath =
    typeof options.outputPath === 'function'
      ? options.outputPath
      : createRenameOutput(options.outputPath ?? 'simple');

  const output: OutputFile[] = [];
  const storage = new Map<string, ParsedFile>();

  for (const rawFile of rawFiles) {
    scanFile(rawFile);
  }

  function scanFile(file: VaultFile) {
    const normalizedPath = normalize(file.path);
    const ext = path.extname(normalizedPath);
    let parsed: ParsedFile;

    if (ext === '.md' || ext === '.mdx') {
      const { data, content } = matter(String(file.content));

      parsed = {
        format: 'content',
        path: normalizedPath,
        outPath: outputPath(
          normalizedPath.slice(0, -ext.length) + '.mdx',
          file,
        ),
        frontmatter: frontmatterSchema.parse(data),
        content,
      };
    } else {
      const outPath = outputPath(normalizedPath, file);

      parsed = {
        format: 'media',
        path: normalizedPath,
        outPath,
        content: file.content,
        url: url(outPath, file),
      };
    }

    storage.set(normalizedPath, parsed);
  }

  const context: InternalContext = {
    storage,
  };

  const processor = unified()
    .use(remarkParse)
    .use(remarkConvert, context)
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

  await Promise.all(Array.from(storage.values()).map(onFile));
  return output;
}

type RenameOutputPreset = 'ignore' | 'simple';

function createRenameOutput(preset: RenameOutputPreset): RenameOutputFn {
  if (preset === 'ignore') return (file) => file;

  return (file) => file.toLowerCase().replaceAll(' ', '-');
}
