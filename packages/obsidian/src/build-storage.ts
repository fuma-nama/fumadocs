import path from 'node:path';
import matter from 'gray-matter';
import { type Frontmatter, frontmatterSchema } from '@/utils/schema';
import { stash } from '@/utils/stash';
import type { VaultFile } from '@/read-vaults';

type RenameOutputFn = (originalOutputPath: string, file: VaultFile) => string;
type RenameOutputPreset = 'ignore' | 'simple';

export interface VaultStorageOptions {
  /**
   * rename output path
   *
   * @defaultValue 'simple'
   */
  outputPath?: RenameOutputFn | RenameOutputPreset;

  /**
   * generate URL from media file, default to original file path (normalized)
   */
  url?: (outputPath: string, mediaFile: VaultFile) => string | undefined;
}

/**
 * a virtual storage containing all files in the vault
 */
export interface VaultStorage {
  files: Map<string, ParsedFile>;
}

export type ParsedFile = ParsedContentFile | ParsedMediaFile;

export interface ParsedContentFile extends Omit<VaultFile, 'content'> {
  format: 'content';
  frontmatter: Frontmatter;

  /**
   * output path (relative to content directory)
   */
  outPath: string;
  content: string;
}

export interface ParsedMediaFile extends VaultFile {
  format: 'media';

  /**
   * output path (relative to asset directory)
   */
  outPath: string;
  /**
   * The output URL. When undefined, it means the file is only accessible via paths.
   */
  url?: string;
}

/**
 * Build virtual storage containing all files in the vault
 */
export function buildStorage(
  rawFiles: VaultFile[],
  options: VaultStorageOptions = {},
): VaultStorage {
  const {
    url = (file) => {
      const segs = normalize(file)
        .split('/')
        .filter((v) => v.length > 0);
      return `/${segs.join('/')}`;
    },
    outputPath: outputPathOption = 'simple',
  } = options;
  const getOutputPath =
    typeof outputPathOption === 'function'
      ? outputPathOption
      : createRenameOutput(outputPathOption);

  const storage = new Map<string, ParsedFile>();

  for (const rawFile of rawFiles) {
    parseFile(rawFile);
  }

  function parseFile(file: VaultFile) {
    const normalizedPath = normalize(file.path);
    const ext = path.extname(normalizedPath);
    let parsed: ParsedFile;

    if (ext === '.md' || ext === '.mdx') {
      const { data, content } = matter(String(file.content));

      parsed = {
        format: 'content',
        _raw: file._raw,
        path: normalizedPath,
        outPath: getOutputPath(
          normalizedPath.slice(0, -ext.length) + '.mdx',
          file,
        ),
        frontmatter: frontmatterSchema.parse(data),
        content,
      };
    } else {
      const outPath = getOutputPath(normalizedPath, file);

      parsed = {
        format: 'media',
        path: normalizedPath,
        _raw: file._raw,
        outPath,
        content: file.content,
        url: url(outPath, file),
      };
    }

    storage.set(normalizedPath, parsed);
  }

  return { files: storage };
}

function createRenameOutput(preset: RenameOutputPreset): RenameOutputFn {
  if (preset === 'ignore') return (file) => file;

  return (file) => file.toLowerCase().replaceAll(' ', '-');
}

function normalize(filePath: string): string {
  filePath = stash(filePath);
  if (filePath.startsWith('../'))
    throw new Error(`${filePath} points outside of vault folder`);

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}
