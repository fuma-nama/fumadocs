import type { LoaderOutput } from './create';
import type { LoadResult, RawMeta, RawPage } from './load';

export interface FileInfo {
  locale?: string;

  /**
   * Original path of file
   */
  path: string;

  /**
   * File path without extension
   */
  flattenedPath: string;

  /**
   * File name without locale and extension
   */
  name: string;

  dirname: string;
}

export interface MetaData {
  icon?: string;
  title?: string;
  root?: boolean;
  pages?: string[];
}

export interface PageData {
  icon?: string;
  title: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferPageType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config>
    ? RawPage<Config['source']['pageData']>
    : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferMetaType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config>
    ? RawMeta<Config['source']['metaData']>
    : never;

export type Transformer = (context: LoadResult) => void;
