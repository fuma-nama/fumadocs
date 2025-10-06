import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TableOfContents } from 'fumadocs-core/server';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';

export interface FileInfo {
  /**
   * virtualized path for Source API
   */
  path: string;

  /**
   * the file path in file system
   */
  fullPath: string;
}

export interface DocData {
  /**
   * Compiled MDX content (as component)
   */
  body: FC<MDXProps>;

  /**
   * table of contents generated from content.
   */
  toc: TableOfContents;

  /**
   * structured data for document search indexing.
   */
  structuredData: StructuredData;

  /**
   * Raw exports from the compiled MDX file.
   */
  _exports: Record<string, unknown>;

  /**
   * Last modified date of document file, obtained from version control.
   *
   * Only available when `lastModifiedTime` is enabled on global config.
   */
  lastModified?: Date;

  /**
   * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
   */
  extractedReferences?: ExtractedReference[];
}

export interface DocMethods {
  /**
   * file info
   */
  info: FileInfo;

  /**
   * get document as text.
   *
   * - `type: raw` - read the original content from file system.
   * - `type: processed` - get the processed Markdown content, only available when `includeProcessedMarkdown` is enabled on collection config.
   */
  getText: (type: 'raw' | 'processed') => Promise<string>;
}

export type MetaCollectionEntry<Data> = Data & {
  /**
   * file info
   */
  info: FileInfo;
};

export type DocCollectionEntry<Frontmatter> = DocData &
  DocMethods &
  Frontmatter;

export type AsyncDocCollectionEntry<Frontmatter> = DocMethods & {
  load: () => Promise<DocData>;
} & Frontmatter;

export function missingProcessedMarkdown(): never {
  throw new Error(
    "getText('processed') requires `includeProcessedMarkdown` to be enabled in your collection config.",
  );
}
