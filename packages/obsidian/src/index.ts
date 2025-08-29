import path from 'node:path';
import { remark } from 'remark';
import { remarkWikiLink } from '@/remark-wikilink';
import matter from 'gray-matter';
import { stash } from '@/utils/stash';
import remarkMdx from 'remark-mdx';

export interface VaultFile {
  /**
   * paths relative to vault folder
   */
  path: string;

  content: string | ArrayBuffer | Buffer<ArrayBufferLike>;
}

export interface OutputFile {
  type: 'asset' | 'content' | 'custom';

  /**
   * paths relative to target folder, for example:
   * - `type: asset` relative to `./public`
   * - `type: content` relative to `./content/docs`.
   */
  path: string;

  content: string | ArrayBuffer | Buffer<ArrayBufferLike>;
}

export interface ConvertOptions {
  /**
   * generate URL from media file
   */
  url?: (mediaFile: VaultFile) => string;
}

export type ParsedFile = ParsedContentFile | ParsedMediaFile;

export interface ParsedContentFile {
  format: 'content';
  frontmatter: Record<string, unknown>;
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
      const segs = normalize(file.path)
        .split('/')
        .filter((v) => v.length > 0);
      return `/${segs.join('/')}`;
    },
  } = options;
  const output = new Map<string, OutputFile>();
  const storage = new Map<string, ParsedFile>();

  for (const rawFile of rawFiles) {
    scanFile(rawFile);
  }

  function scanFile(file: VaultFile) {
    const normalizedPath = normalize(file.path);
    const ext = path.extname(normalizedPath);

    if (ext === '.md' || ext === '.mdx') {
      const { data, content } = matter(String(file.content));

      const parsed: ParsedFile = {
        format: 'content',
        path: normalizedPath,
        outPath: normalizedPath.slice(0, -ext.length) + '.mdx',
        frontmatter: data,
        content,
      };

      storage.set(normalizedPath, parsed);
      return;
    }

    storage.set(normalizedPath, {
      format: 'media',
      path: normalizedPath,
      outPath: normalizedPath,
      content: file.content,
      url: url(file),
    });
  }

  const context: InternalContext = {
    storage,
  };
  const processor = remark().use(remarkMdx).use(remarkWikiLink, context);
  async function onFile(file: ParsedFile) {
    if (file.format === 'media') {
      output.set(file.path, {
        type: 'asset',
        path: file.path,
        content: file.content,
      });

      return;
    }

    const result = await processor.process({
      value: String(file.content),
      data: {
        source: file,
      },
    });

    output.set(file.outPath, {
      type: 'content',
      path: file.outPath,
      content: String(result.value),
    });
  }

  await Promise.all(Array.from(storage.values()).map(onFile));
  return Array.from(output.values());
}
