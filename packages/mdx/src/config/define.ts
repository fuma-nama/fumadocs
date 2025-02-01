import { type ZodTypeAny, type z } from 'zod';
import { type ProcessorOptions } from '@mdx-js/mdx';
import { type MDXOptions } from '@/utils/build-mdx';
import {
  type BaseCollectionEntry,
  type GlobalConfig,
  type MarkdownProps,
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

export interface BaseCollection<Schema> {
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

  schema?: Schema | ((ctx: TransformContext) => Schema);
}

export interface MetaCollection<Schema extends ZodTypeAny = ZodTypeAny>
  extends BaseCollection<Schema> {
  type: 'meta';
}

export interface DocCollection<
  Schema extends ZodTypeAny = ZodTypeAny,
  Async extends boolean = boolean,
> extends BaseCollection<Schema> {
  type: 'doc';

  mdxOptions?: MDXOptions;

  /**
   * Load files with async
   */
  async?: Async;
}

export function defineCollections<
  T extends 'doc' | 'meta',
  Schema extends ZodTypeAny = ZodTypeAny,
  Async extends boolean = false,
>(
  options: { type: T } & (T extends 'doc'
    ? DocCollection<Schema, Async>
    : MetaCollection<Schema>),
): {
  _doc: 'collections';
  type: T;

  _type: {
    async: Async;

    runtime: T extends 'doc'
      ? Async extends true
        ? z.infer<Schema> &
            BaseCollectionEntry & {
              load: () => Promise<MarkdownProps>;
            }
        : Omit<MarkdownProps, keyof z.infer<Schema>> &
            z.infer<Schema> &
            BaseCollectionEntry
      : typeof options extends MetaCollection
        ? z.infer<Schema> & BaseCollectionEntry
        : never;
  };
} {
  return {
    _doc: 'collections',
    // @ts-expect-error -- internal type inferring
    _type: undefined,
    ...options,
  };
}

export function defineDocs<
  DocData extends ZodTypeAny = typeof frontmatterSchema,
  MetaData extends ZodTypeAny = typeof metaSchema,
  DocAsync extends boolean = false,
>(options?: {
  /**
   * The directory to scan files
   *
   *  @defaultValue 'content/docs'
   */
  dir?: string | string[];

  docs?: Partial<DocCollection<DocData, DocAsync>>;
  meta?: Partial<MetaCollection<MetaData>>;
}): {
  docs: ReturnType<typeof defineCollections<'doc', DocData, DocAsync>>;
  meta: ReturnType<typeof defineCollections<'meta', MetaData, false>>;
} {
  const dir = options?.dir ?? 'content/docs';

  return {
    docs: defineCollections({
      type: 'doc',
      dir,
      schema: frontmatterSchema as unknown as DocData,
      ...options?.docs,
    }),
    meta: defineCollections({
      type: 'meta',
      dir,
      schema: metaSchema as unknown as MetaData,
      ...options?.meta,
    }),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}
