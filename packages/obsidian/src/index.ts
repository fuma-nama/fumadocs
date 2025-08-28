import path from 'node:path';
import { remark } from 'remark';
import { remarkWikiLink } from '@/remark-wikilink';

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

interface ParsedFile extends VaultFile {
  format: 'content' | 'media';
}

declare module 'vfile' {
  interface DataMap {
    source: VaultFile;
  }
}

export interface InternalContext {
  files: ParsedFile[];

  /**
   * get files by full file path
   */
  mediaFiles: Map<string, ParsedFile>;

  /**
   * get files by file name (without extension)
   */
  contentByName: Map<string, ParsedFile>;
}

function normalize(filePath: string): string {
  filePath = filePath.replaceAll('\\', '/');

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}

export async function convertVaultFiles(
  rawFiles: VaultFile[],
): Promise<OutputFile[]> {
  const files: ParsedFile[] = rawFiles.map((file) => {
    const ext = path.extname(file.path);

    return {
      ...file,
      format: ext === '.md' || ext === '.mdx' ? 'content' : 'media',
      path: normalize(file.path),
    };
  });

  const output = new Map<string, OutputFile>();
  const mediaFiles = new Map<string, ParsedFile>();
  const contentFiles = new Map<string, ParsedFile>();

  for (const file of files) {
    const ext = path.extname(file.path);

    if (file.format === 'content') {
      contentFiles.set(file.path.slice(0, -ext.length), file);
    } else {
      mediaFiles.set(file.path, file);
    }
  }

  const context: InternalContext = {
    files,
    mediaFiles,
    contentByName: contentFiles,
  };
  const processor = remark().use(remarkWikiLink, context);

  async function onFile(file: VaultFile) {
    if (mediaFiles.has(file.path)) {
      output.set(file.path, {
        type: 'asset',
        ...file,
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

  await Promise.all(files.map(onFile));
  return Array.from(output.values());
}
