import fs from 'node:fs/promises';

export interface SourceFile {
  /** path relative to the content directory */
  path: string;
  absolutePath: string;
  /** read the file as UTF-8 */
  read: () => Promise<string>;
}

export type ParsedFile<Page, Meta> = { type: 'page'; data: Page } | { type: 'meta'; data: Meta };

/**
 * Turns files into the pages and meta entries a source exposes.
 *
 * This is the only part that knows what your content actually is, the source
 * itself only deals with the file system.
 */
export interface ContentIntegration<Page, Meta> {
  /** glob patterns to scan, relative to the content directory */
  include: string[];
  /**
   * Parse a file, or return `undefined` to skip it.
   *
   * Called again after the file is invalidated, so anything expensive on the
   * returned data (such as compiling) should be memoized per call.
   */
  parse: (file: SourceFile) => Promise<ParsedFile<Page, Meta> | undefined>;
}

export function createSourceFile(path: string, absolutePath: string): SourceFile {
  let content: Promise<string> | undefined;

  return {
    path,
    absolutePath,
    read: () => (content ??= fs.readFile(absolutePath, 'utf-8')),
  };
}
