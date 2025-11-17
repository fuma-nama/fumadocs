import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Root } from 'mdast';
import type { MDXContent } from 'mdx/types';

export interface DocData {
  /**
   * Compiled MDX content (as component)
   */
  body: MDXContent;

  /**
   * table of contents generated from content.
   */
  toc: TOCItemType[];

  /**
   * structured data for document search indexing.
   */
  structuredData: StructuredData;

  /**
   * Raw exports from the compiled MDX file.
   */
  _exports: Record<string, unknown>;
}

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

  getMDAST: () => Promise<Root>;
}

export interface MetaMethods {
  /**
   * file info
   */
  info: FileInfo;
}

export interface InternalTypeConfig {
  /**
   * collection name -> collection properties
   */
  DocData: Record<string, unknown>;
}
