import path from 'node:path';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { slash } from '@/utils/slash';

export interface VaultFile {
  /** path relative to the vault directory */
  path: string;
  _raw: {
    /** absolute file-system path */
    path: string;
  };
  /** file content, omitted for media files so they are never read into memory */
  content?: string | Buffer<ArrayBufferLike>;
}

export interface VaultStorageOptions {
  /**
   * Generate a URL for a media file. Defaults to a root-relative vault path.
   */
  url?: (vaultPath: string, mediaFile: ParsedMediaFile) => string | undefined;
}

/**
 * a virtual storage containing all files in the vault
 */
export interface VaultStorage {
  files: Map<string, ParsedFile>;
}

export type ParsedFile = ParsedContentFile | ParsedMediaFile | ParsedDataFile;

/**
 * Frontmatter as written in the vault. Kept unvalidated here so a single
 * malformed note cannot break the whole vault, the configurable schema
 * validates it per-page instead.
 */
export type RawFrontmatter = Record<string, unknown>;

export interface ParsedContentFile extends Omit<VaultFile, 'content'> {
  format: 'content';
  frontmatter: RawFrontmatter;
  content: string;
}

export interface ParsedMediaFile extends Omit<VaultFile, 'content'> {
  format: 'media';
  /**
   * The output URL. When undefined, it means the file is only accessible via paths.
   */
  url?: string;
}

export interface ParsedDataFile extends Omit<VaultFile, 'content'> {
  format: 'data';
  content: string | Buffer<ArrayBufferLike>;
}

const ContentExtensions = new Set(['.md', '.mdx']);
const DataExtensions = new Set(['.json', '.yaml', '.yml', '.toml']);

export function getFileFormat(filePath: string): ParsedFile['format'] {
  const ext = path.extname(filePath);

  if (DataExtensions.has(ext)) return 'data';
  if (ContentExtensions.has(ext)) return 'content';
  return 'media';
}

/**
 * Build virtual storage containing all files in the vault
 */
export function buildStorage(
  rawFiles: Iterable<VaultFile>,
  options: VaultStorageOptions = {},
): VaultStorage {
  const { url = (file) => `/${file}` } = options;

  const storage = new Map<string, ParsedFile>();

  for (const rawFile of rawFiles) {
    const normalizedPath = normalize(rawFile.path);
    let parsed: ParsedFile;

    const format = getFileFormat(normalizedPath);

    if (format === 'data') {
      parsed = {
        format,
        path: normalizedPath,
        _raw: rawFile._raw,
        content: rawFile.content ?? '',
      };
    } else if (format === 'content') {
      const { data, content } = frontmatter(String(rawFile.content ?? ''));

      parsed = {
        format,
        _raw: rawFile._raw,
        path: normalizedPath,
        frontmatter: toRawFrontmatter(data),
        content,
      };
    } else {
      const media: ParsedMediaFile = {
        format,
        path: normalizedPath,
        _raw: rawFile._raw,
      };
      media.url = url(normalizedPath, media);
      parsed = media;
    }

    storage.set(normalizedPath, parsed);
  }

  return { files: storage };
}

function toRawFrontmatter(data: unknown): RawFrontmatter {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as RawFrontmatter;
  }

  return {};
}

function normalize(filePath: string): string {
  filePath = slash(filePath);
  if (filePath.startsWith('../')) throw new Error(`${filePath} points outside of vault folder`);

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}
