import { type ProcessorOptions } from '@mdx-js/mdx';
import { type MDXOptions } from '@/utils/build-mdx';
import { type GlobalConfig } from '@/config/types';
import { frontmatterSchema, metaSchema } from '@/utils/schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';

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
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection<Schema> {
  type: 'meta';
}

export interface DocCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> extends BaseCollection<Schema> {
  type: 'doc';

  mdxOptions?: MDXOptions;

  /**
   * Load files with async
   */
  async?: Async;
}

export interface DocsCollection<
  DocSchema extends StandardSchemaV1 = StandardSchemaV1,
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> {
  type: 'docs';
  dir: string | string[];

  docs: DocCollection<DocSchema, Async>;
  meta: MetaCollection<MetaSchema>;
}

export function defineCollections<
  T extends 'doc' | 'meta',
  Schema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = false,
>(
  options: { type: T } & (T extends 'doc'
    ? DocCollection<Schema, Async>
    : MetaCollection<Schema>),
): {
  type: T;

  _type: {
    async: Async;
    schema: Schema;
  };
} {
  return {
    // @ts-expect-error -- internal type inferring
    _type: undefined,
    ...options,
  };
}

export function defineDocs<
  DocSchema extends StandardSchemaV1 = typeof frontmatterSchema,
  MetaSchema extends StandardSchemaV1 = typeof metaSchema,
  Async extends boolean = false,
>(options?: {
  /**
   * The directory to scan files
   *
   *  @defaultValue 'content/docs'
   */
  dir?: string | string[];

  docs?: Omit<DocCollection<DocSchema, Async>, 'dir' | 'type'>;
  meta?: Omit<MetaCollection<MetaSchema>, 'dir' | 'type'>;
}): {
  type: 'docs';

  docs: {
    type: 'doc';
    _type: {
      schema: DocSchema;
      async: Async;
    };
  };

  meta: {
    type: 'meta';
    _type: {
      schema: MetaSchema;
      async: false;
    };
  };
} {
  if (!options)
    console.warn(
      '[`source.config.ts`] Deprecated: please pass options to `defineDocs()` and specify a `dir`.',
    );
  const dir = options?.dir ?? 'content/docs';

  return {
    type: 'docs',
    // @ts-expect-error -- internal type inferring
    docs: defineCollections({
      type: 'doc',
      dir,
      schema: frontmatterSchema,
      ...options?.docs,
    }),
    // @ts-expect-error -- internal type inferring
    meta: defineCollections({
      type: 'meta',
      dir,
      schema: metaSchema,
      ...options?.meta,
    }),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}
