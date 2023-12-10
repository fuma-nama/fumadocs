import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'next-docs-zeta/mdx-plugins';
import type { TableOfContents } from 'next-docs-zeta/server';
import type * as Default from './validate/schema';

export interface FileInfo {
  locale?: string;

  /**
   * File extension, starting with a dot, like `.json`
   */
  type: string;

  /**
   * Directories of file
   */
  dirname: string;

  /**
   * File name with extension
   */
  base: string;

  /**
   * File name without extension
   */
  name: string;

  /**
   * Path relative to `rootDir`
   */
  path: string;

  /**
   * A flatten path without extensions and prefixes, like `dir/file`
   *
   * relative to `rootDir`
   */
  flattenedPath: string;

  /**
   * Unique ID for each file, based on original path which is not relative to `rootDir`
   */
  id: string;
}

/**
 * Defalt MDX properties, feel free to extend
 */
export interface MDXExport {
  default: (props: MDXProps) => JSX.Element;
  frontmatter: Frontmatter;
  toc: TableOfContents;
  structuredData: StructuredData;
}

export type Frontmatter = Default.Frontmatter;

export type JsonExport = Default.MetaExport;

export interface Meta {
  file: FileInfo;
  data: JsonExport;
}

export interface Page {
  file: FileInfo;
  url: string;
  slugs: string[];
  data: MDXExport;
  matter: Frontmatter;
}
