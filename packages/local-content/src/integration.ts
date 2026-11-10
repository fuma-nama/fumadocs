import type { Params } from 'fumadocs-core/source';

export interface SourceFile {
  /** path relative to the content directory */
  path: string;
  absolutePath: string;
  /** read the file as UTF-8 */
  read: () => Promise<string>;
  /** invalidate this file when another file changes, like the files it includes */
  addDependency: (file: string) => void;
}

export type ParsedFile<Page, Meta> =
  | {
      type: 'page';
      data: Page;
      /**
       * For a file of a dynamic path, like `[framework]/deploy.mdx`, the data of its page at some params.
       *
       * With `custom`, the page with the custom props of `getPage()`, returned synchronously: `data` is the data of the
       * page at these params.
       */
      dataAt?: (
        params: Params,
        custom?: { props: Record<string, unknown>; data: Page },
      ) => Page | Promise<Page>;
    }
  | {
      type: 'meta';
      data: Meta;
      /** for a meta file of a dynamic folder, its data in the folder filled with some params */
      dataAt?: (params: Params) => Meta | Promise<Meta>;
    };

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
