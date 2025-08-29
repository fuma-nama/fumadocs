import path from 'node:path';
import { remark } from 'remark';
import { remarkWikiLink } from '@/remark-wikilink';
import matter from 'gray-matter';
import { stash } from '@/utils/stash';

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

export type ParsedFile = ParsedContentFile | ParsedMediaFile;

export interface ParsedContentFile {
  format: 'content';
  frontmatter: Record<string, unknown>;
  path: string;
  content: string;
}

export interface ParsedMediaFile {
  format: 'media';
  path: string;
  content: VaultFile['content'];
}

declare module 'vfile' {
  interface DataMap {
    source: VaultFile;
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

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}

export async function convertVaultFiles(
  rawFiles: VaultFile[],
): Promise<OutputFile[]> {
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
        frontmatter: data,
        content,
      };

      storage.set(normalizedPath, parsed);
      return;
    }

    storage.set(normalizedPath, {
      format: 'media',
      path: normalizedPath,
      content: file.content,
    });
  }

  const context: InternalContext = {
    storage,
  };
  const processor = remark().use(remarkWikiLink, context);
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
      path: file.path,
      value: String(file.content),
      data: {
        source: file,
      },
    });

    output.set(file.path, {
      type: 'content',
      path: file.path,
      content: String(result.value),
    });
  }

  await Promise.all(Array.from(storage.values()).map(onFile));
  return Array.from(output.values());
}
