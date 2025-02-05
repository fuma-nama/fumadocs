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

export interface DocsCollection {
  type: 'docs';
  docs: DocCollection;
  meta: MetaCollection;
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
  DocData extends StandardSchemaV1 = typeof frontmatterSchema,
  MetaData extends StandardSchemaV1 = typeof metaSchema,
  DocAsync extends boolean = false,
>(options?: {
  /**
   * The directory to scan files
   *
   *  @defaultValue 'content/docs'
   */
  dir?: string | string[];

  docs?: Omit<DocCollection<DocData, DocAsync>, 'dir' | 'type'>;
  meta?: Omit<MetaCollection<MetaData>, 'dir' | 'type'>;
}): {
  type: 'docs';
  docs: ReturnType<typeof defineCollections<'doc', DocData, DocAsync>>;
  meta: ReturnType<typeof defineCollections<'meta', MetaData, false>>;
} {
  const dir = options?.dir ?? 'content/docs';

  return {
    type: 'docs',
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
