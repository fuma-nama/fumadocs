import { type AnyZodObject, type z } from 'zod';
import { type ProcessorOptions } from '@mdx-js/mdx';
import { type MDXOptions } from '@/utils/build-mdx';
import {
  type BaseCollectionEntry,
  type CollectionEntry,
  type GlobalConfig,
  type SupportedType,
} from '@/config/types';
import { frontmatterSchema, metaSchema } from '@/utils/schema';

export interface TransformContext {
  path: string;
  source: string;

  /**
   * Compile MDX to JavaScript
   */
  buildMDX: (source: string, options?: ProcessorOptions) => Promise<string>;
}

export interface Collections<
  Schema extends AnyZodObject = AnyZodObject,
  Type extends SupportedType = SupportedType,
  Output extends BaseCollectionEntry = CollectionEntry<Type, z.output<Schema>>,
> {
  /**
   * Directories to scan
   */
  dir: string | string[];

  /**
   * what files to include/exclude (glob patterns)
   *
   * Include all files if not specified
   */
  files?: string[];

  schema: Schema | ((ctx: TransformContext) => Schema);

  /**
   * content type
   */
  type: Type;

  /**
   * Do transformation in runtime.
   *
   * This cannot be optimized by bundlers/loaders, avoid expensive calculations here.
   */
  transform?: (
    entry: CollectionEntry<Type, z.output<Schema>>,
    globalConfig?: GlobalConfig,
  ) => Output | Promise<Output>;

  mdxOptions?: Type extends 'doc' ? MDXOptions : never;
}

export function defineCollections<
  Schema extends AnyZodObject,
  Type extends SupportedType,
  Output extends BaseCollectionEntry = CollectionEntry<Type, z.output<Schema>>,
>(
  options: Collections<Schema, Type, Output>,
): {
  _doc: 'collections';
} & Collections<Schema, Type, Output> {
  return {
    _doc: 'collections',
    ...options,
  };
}

export function defineDocs<
  F extends AnyZodObject = typeof frontmatterSchema,
  M extends AnyZodObject = typeof metaSchema,
  DocsOut extends BaseCollectionEntry = CollectionEntry<'doc', z.output<F>>,
  MetaOut extends BaseCollectionEntry = CollectionEntry<'meta', z.output<M>>,
>(options?: {
  docs?: Partial<Collections<F, 'doc', DocsOut>>;
  meta?: Partial<Collections<M, 'meta', MetaOut>>;
}): {
  docs: Collections<F, 'doc', DocsOut>;
  meta: Collections<M, 'meta', MetaOut>;
} {
  return {
    docs: defineCollections({
      type: 'doc',
      dir: 'content/docs',
      schema: frontmatterSchema as unknown as F,
      ...options?.docs,
    }),
    meta: defineCollections({
      type: 'meta',
      dir: 'content/docs',
      files: ['**/*/meta.json'],
      schema: metaSchema as M,
      ...options?.meta,
    }),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}
