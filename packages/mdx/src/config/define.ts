import { type MDXOptions } from '@/utils/build-mdx';
import { frontmatterSchema, metaSchema } from '@/utils/schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DefaultMDXOptions } from '@/utils/mdx-options';

export type CollectionSchema<Schema extends StandardSchemaV1, Context> =
  | Schema
  | ((ctx: Context) => Schema);

export interface BaseCollection {
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
}

export interface MetaCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection {
  type: 'meta';

  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> extends BaseCollection {
  type: 'doc';

  mdxOptions?: MDXOptions;

  /**
   * Load files with async
   */
  async?: Async;

  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocsCollection<
  DocSchema extends StandardSchemaV1 = StandardSchemaV1,
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> {
  type: 'docs';

  docs: DocCollection<DocSchema, Async>;
  meta: MetaCollection<MetaSchema>;
}

export interface GlobalConfig {
  /**
   * Configure global MDX options
   */
  mdxOptions?:
    | DefaultMDXOptions
    | (() => DefaultMDXOptions | Promise<DefaultMDXOptions>);

  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';
}

export function defineCollections<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = false,
>(options: DocCollection<Schema, Async>): DocCollection<Schema, Async>;
export function defineCollections<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
>(options: MetaCollection<Schema>): MetaCollection<Schema>;

export function defineCollections(
  options: DocCollection | MetaCollection,
): DocCollection | MetaCollection {
  return options as any;
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
}): DocsCollection<DocSchema, MetaSchema, Async> {
  if (!options)
    console.warn(
      '[`source.config.ts`] Deprecated: please pass options to `defineDocs()` and specify a `dir`.',
    );
  const dir = options?.dir ?? 'content/docs';

  return {
    type: 'docs',
    docs: defineCollections({
      type: 'doc',
      dir,
      schema: frontmatterSchema as any,
      ...options?.docs,
    }),
    meta: defineCollections({
      type: 'meta',
      files: ['**/*.{json,yaml}'],
      dir,
      schema: metaSchema as any,
      ...options?.meta,
    }),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}
