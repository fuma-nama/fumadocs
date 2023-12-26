import type { Source, PageData, MetaData } from 'next-docs-zeta/source';
import type { AnyZodObject, z } from 'zod';
import { resolveFiles, type SchemaOptions } from './resolve-files';
import type { DefaultFrontmatter, DefaultMetaData, MDXPageData } from './types';

interface UtilsOptions {
  schema: Partial<SchemaOptions>;
}

type PartialUtilsOptions = Partial<UtilsOptions>;

interface RootConfig {
  schema: {
    frontmatter: PageData;
    meta: MetaData;
  };
}

type GetSchemaType<Schema, DefaultValue> = Schema extends AnyZodObject
  ? z.infer<Schema>
  : DefaultValue;

/**
 * Get accurate options type from partial options
 */
interface TransformPartialOptions<TOptions extends PartialUtilsOptions> {
  schema: {
    frontmatter: GetSchemaType<
      NonNullable<TOptions['schema']>['frontmatter'],
      DefaultFrontmatter
    >;
    meta: GetSchemaType<
      NonNullable<TOptions['schema']>['meta'],
      DefaultMetaData
    >;
  };
}

type GetSourceFromOptions<TTypes extends RootConfig> = Source<{
  metaData: TTypes['schema']['meta'];
  pageData: MDXPageData<TTypes['schema']['frontmatter']>;
}>;

export function createMDXSource<Options extends PartialUtilsOptions>(
  map: Record<string, unknown>,
  options?: Options,
): GetSourceFromOptions<
  TransformPartialOptions<Options> extends RootConfig
    ? TransformPartialOptions<Options>
    : never
> {
  const files = resolveFiles({ map, schema: options?.schema });

  return {
    files,
  };
}

export { defaultSchemas } from './validate/schema';
