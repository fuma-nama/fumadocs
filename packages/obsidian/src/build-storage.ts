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

  /**
   * enforce all Markdown documents to be MDX
   *
   * @defaultValue true
   */
  enforceMdx?: boolean;
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
    enforceMdx = true,
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
    let outPath = getOutputPath(normalizedPath, file);
    let parsed: ParsedFile;

    if (['.md', '.mdx'].includes(path.extname(normalizedPath))) {
      const { data, content } = matter(String(file.content));
      if (enforceMdx) {
        outPath = outPath.slice(0, -path.extname(outPath).length) + '.mdx';
      }

      parsed = {
        format: 'content',
        _raw: file._raw,
        path: normalizedPath,
        outPath,
        frontmatter: frontmatterSchema.parse(data),
        content,
      };
    } else {
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
