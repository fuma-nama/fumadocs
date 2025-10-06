export {
  createPageTreeBuilder,
  type PageTreeTransformer,
  type PageTreeBuilder,
  type PageTreeBuilderContext,
  type PageTreeOptions,
} from './page-tree/builder';
export * from './loader';
export { getSlugs } from './plugins/slugs';
export { FileSystem } from './storage/file-system';

export {
  type PageFile,
  type MetaFile,
  type ContentStorage,
} from './storage/content';
export type * from './types';
export * as PathUtils from './path';
export type * from './plugins';

/**
 * @deprecated
 */
export type { TransformContentStorage as Transformer } from './plugins/compat';

/**
 * @deprecated
 */
export { type FileInfo, parseFilePath } from './path';
