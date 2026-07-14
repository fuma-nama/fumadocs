import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { MetaData, PageData } from 'fumadocs-core/source';
import type { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import type { CollectionSchema } from '@/config/define';
import type { BuildEnvironment } from '@/config/build';
import type { ExtractedReference, PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import type { SatteriOptionsInput } from '@/loaders/mdx/build-satteri';
import type {
  MacroAsyncDocCollection,
  MacroAsyncDocsCollection,
  MacroDocCollection,
  MacroDocsCollection,
  MacroMetaCollection,
} from '@/runtime/macro';

export interface MacroSchemaContext {
  path: string;
  source: string;
}

export interface DocMacroOptions<Schema extends StandardSchemaV1 = StandardSchemaV1> {
  /**
   * Patterns of content files (relative to `dir`).
   *
   * Must be statically analyzable (string literals).
   */
  files?: string[];

  /**
   * Load the compiled content lazily.
   *
   * Must be statically analyzable (boolean literal).
   */
  async?: boolean;

  /**
   * The compiler for content files.
   */
  compiler?: 'mdx' | 'satteri';

  /**
   * By defining a collection-level MDX options, **the default options & plugins will be removed**.
   */
  mdxOptions?: ProcessorOptions | ((environment: BuildEnvironment) => Promise<ProcessorOptions>);

  /**
   * Sätteri compile options, used when `compiler` is `satteri`.
   */
  satteriOptions?: SatteriOptionsInput;

  postprocess?: Partial<PostprocessOptions>;

  schema?: CollectionSchema<Schema, MacroSchemaContext>;
}

export interface MetaMacroOptions<Schema extends StandardSchemaV1 = StandardSchemaV1> {
  /**
   * Patterns of meta files (relative to `dir`).
   *
   * Must be statically analyzable (string literals).
   */
  files?: string[];

  schema?: CollectionSchema<Schema, MacroSchemaContext>;
}

export interface DefineDocsOptions {
  /**
   * Directory of content files, relative to project root.
   *
   * Must be statically analyzable (string literal).
   *
   * @defaultValue 'content/docs'
   */
  dir?: string;

  docs?: DocMacroOptions;
  meta?: MetaMacroOptions;
}

export type DefineCollectionsOptions =
  | ({
      type: 'doc';
      /**
       * Directory of content files, relative to project root.
       *
       * Must be statically analyzable (string literal).
       */
      dir: string;
    } & DocMacroOptions)
  | ({
      type: 'meta';
      /**
       * Directory of meta files, relative to project root.
       *
       * Must be statically analyzable (string literal).
       */
      dir: string;
    } & MetaMacroOptions);

type Out<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<S>;

type InferSchema<S, Default extends StandardSchemaV1> = S extends StandardSchemaV1
  ? S
  : S extends (ctx: never) => infer R
    ? R extends StandardSchemaV1
      ? R
      : Default
    : Default;

type SchemaOf<O, Default extends StandardSchemaV1> = O extends { schema: infer S }
  ? InferSchema<S, Default>
  : Default;

type DocExtraOf<O> = O extends { postprocess: { extractLinkReferences: true } }
  ? { extractedReferences: ExtractedReference[] }
  : unknown;

export type DefineDocsResult<O extends DefineDocsOptions> =
  Out<SchemaOf<O['docs'], typeof pageSchema>> extends infer Doc
    ? Out<SchemaOf<O['meta'], typeof metaSchema>> extends infer Meta
      ? Doc extends PageData
        ? Meta extends MetaData
          ? O['docs'] extends { async: true }
            ? MacroAsyncDocsCollection<Doc, Meta, DocExtraOf<O['docs']>>
            : MacroDocsCollection<Doc, Meta, DocExtraOf<O['docs']>>
          : never
        : never
      : never
    : never;

export type DefineCollectionsResult<O extends DefineCollectionsOptions> = O extends {
  type: 'meta';
}
  ? MacroMetaCollection<O extends { schema: infer S } ? Out<InferSchema<S, never>> : unknown>
  : O extends { async: true }
    ? MacroAsyncDocCollection<
        O extends { schema: infer S } ? Out<InferSchema<S, never>> : unknown,
        DocExtraOf<O>
      >
    : MacroDocCollection<
        O extends { schema: infer S } ? Out<InferSchema<S, never>> : unknown,
        DocExtraOf<O>
      >;

function macroError(): Error {
  return new Error(
    '[MDX] this macro was not compiled by the bundler plugin of `fumadocs-mdx`. To use `fumadocs-mdx/macro`, set the `include` option on your bundler plugin, and make sure this module matches its patterns.',
  );
}

/**
 * Define a docs collection (doc + meta), compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineDocs<const Options extends DefineDocsOptions = Record<never, never>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- compiled away by the bundler plugin
  options?: Options,
): DefineDocsResult<Options> {
  throw macroError();
}

/**
 * Define a doc/meta collection, compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineCollections<const Options extends DefineCollectionsOptions>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- compiled away by the bundler plugin
  options: Options,
): DefineCollectionsResult<Options> {
  throw macroError();
}

export type {
  MacroAsyncDocCollection,
  MacroAsyncDocsCollection,
  MacroDocCollection,
  MacroDocsCollection,
  MacroMetaCollection,
};
