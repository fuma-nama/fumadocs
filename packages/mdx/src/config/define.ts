import { type ZodTypeAny, type z } from 'zod';
import { type ProcessorOptions } from '@mdx-js/mdx';
import { type MDXOptions } from '@/utils/build-mdx';
import {
  type BaseCollectionEntry,
  type FileInfo,
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

export interface MetaCollection<
  Schema extends ZodTypeAny = ZodTypeAny,
  TransformOutput = unknown,
> extends BaseCollection<Schema> {
  type: 'meta';

  /**
   * Do transformation in runtime.
   *
   * This cannot be optimized by bundlers/loaders, avoid expensive calculations here.
   */
  transform?: (
    entry: {
      data: z.output<Schema>;
      file: FileInfo;
    },
    globalConfig?: GlobalConfig,
  ) => TransformOutput | Promise<TransformOutput>;
}

export interface DocCollection<
  Schema extends ZodTypeAny = ZodTypeAny,
  Async extends boolean = boolean,
  TransformOutput = unknown,
> extends BaseCollection<Schema> {
  type: 'doc';

  /**
   * Do transformation in runtime.
   *
   * This cannot be optimized by bundlers/loaders, avoid expensive calculations here.
   */
  transform?: (
    entry: {
      data: z.output<Schema>;
      file: FileInfo;
      mdx: Async extends true ? MarkdownProps : never;
    },
    globalConfig?: GlobalConfig,
  ) => TransformOutput | Promise<TransformOutput>;

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
  TransformOutput = unknown,
>(
  options: { type: T } & (T extends 'doc'
    ? DocCollection<Schema, Async, TransformOutput>
    : MetaCollection<Schema, TransformOutput>),
): {
  _doc: 'collections';
  type: T;

  _type: {
    async: Async;
    transform: TransformOutput;

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
  DocOut = unknown,
  MetaOut = unknown,
>(options?: {
  /**
   * The directory to scan files
   *
   *  @defaultValue 'content/docs'
   */
  dir?: string | string[];

  docs?: Partial<DocCollection<DocData, DocAsync, DocOut>>;
  meta?: Partial<MetaCollection<MetaData, MetaOut>>;
}): {
  docs: ReturnType<typeof defineCollections<'doc', DocData, DocAsync, DocOut>>;
  meta: ReturnType<typeof defineCollections<'meta', MetaData, false, MetaOut>>;
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
