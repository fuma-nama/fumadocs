import path from 'node:path';
import matter from 'gray-matter';
import { type Frontmatter, frontmatterSchema } from '@/utils/schema';
import { slash } from '@/utils/slash';
import type { VaultFile } from '@/read-vaults';
import { slug } from 'github-slugger';

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

export type ParsedFile = ParsedContentFile | ParsedMediaFile | ParsedDataFile;

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

export interface ParsedDataFile extends VaultFile {
  format: 'data';
  outPath: string;
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
    const normalizedPath = normalize(rawFile.path);
    let outPath = getOutputPath(normalizedPath, rawFile);
    let parsed: ParsedFile;

    const basename = path.basename(normalizedPath).toLowerCase();

    if (basename === 'meta.json') {
      parsed = {
        format: 'data',
        path: normalizedPath,
        _raw: rawFile._raw,
        outPath,
        content: rawFile.content,
      };
    } else if (['.md', '.mdx'].includes(path.extname(normalizedPath))) {
      const { data, content } = matter(String(rawFile.content));
      if (enforceMdx) {
        outPath = outPath.slice(0, -path.extname(outPath).length) + '.mdx';
      }

      parsed = {
        format: 'content',
        _raw: rawFile._raw,
        path: normalizedPath,
        outPath,
        frontmatter: frontmatterSchema.parse(data),
        content,
      };
    } else {
      parsed = {
        format: 'media',
        path: normalizedPath,
        _raw: rawFile._raw,
        outPath,
        content: rawFile.content,
        url: url(outPath, rawFile),
      };
    }

    storage.set(normalizedPath, parsed);
  }

  return { files: storage };
}

function createRenameOutput(preset: RenameOutputPreset): RenameOutputFn {
  if (preset === 'ignore') return (file) => file;

  const occurrences = new Map<string, number>();
  return (file) => {
    const ext = path.extname(file);
    const segs = file.slice(0, -ext.length).split('/');
    for (let i = 0; i < segs.length; i++) {
      // preserve separators
      segs[i] = slug(segs[i]);
    }
    // we only count occurrences by the full path
    let out = segs.join('/');
    const o = occurrences.get(out) ?? 0;
    occurrences.set(out, o + 1);
    if (o > 0) out += `-${o}`;
    return out + ext;
  };
}

function normalize(filePath: string): string {
  filePath = slash(filePath);
  if (filePath.startsWith('../')) throw new Error(`${filePath} points outside of vault folder`);

  return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}
