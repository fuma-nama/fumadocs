import type { Result } from './load';

export interface FileInfo {
  locale?: string;

  /**
   * Original path of file
   */
  path: string;

  /**
   * File path without extension & prefix
   */
  flattenedPath: string;

  /**
   * File name without extension
   */
  name: string;

  dirname: string;
}

export interface Meta {
  file: FileInfo;
  icon?: string;
  title?: string;
  pages: string[];
}

export interface Page {
  file: FileInfo;
  icon?: string;
  title: string;
  url: string;
}

export type Transformer = (context: Result) => void | Promise<void>;
