import { type AnyZodObject, type z } from 'zod';
import { type ProcessorOptions } from '@mdx-js/mdx';
import { type MDXOptions } from '@/utils/build-mdx';
import { type GetCollectionEntry, type SupportedType } from '@/config/types';

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
  Output = GetCollectionEntry<Type, z.output<Schema>>,
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
    entry: GetCollectionEntry<Type, z.output<Schema>>,
  ) => Output | Promise<Output>;

  mdxOptions?: Type extends 'doc' ? MDXOptions : never;
}

export function defineCollections<
  Schema extends AnyZodObject,
  Type extends SupportedType,
  Output = GetCollectionEntry<Type, z.output<Schema>>,
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
