import {
  createGetUrl,
  type BuildPageTreeOptions,
  type PageTree,
} from 'next-docs-zeta/server';
import type { AnyZodObject, z } from 'zod';
import { getPageTreeBuilder, type BuilderOptions } from './build-tree';
import { createPageUtils, type PageUtils } from './page-utils';
import {
  resolveFiles,
  type ResolvedFiles,
  type SchemaOptions,
  type ResolveOptions,
} from './resolve-files';
import type { DefaultFrontmatter, DefaultMetaData, Meta, Page } from './types';
import { defaultSchemas } from './validate/schema';

interface UtilsOptions extends BuilderOptions {
  languages: string[] | undefined;

  /**
   * @defaultValue `'/'`
   */
  baseUrl: string;

  schema: Partial<SchemaOptions>;

  getUrl: ResolveOptions['getUrl'];
  getSlugs: ResolveOptions['getSlugs'];
  rootDir: ResolveOptions['rootDir'];
  pageTreeOptions: BuildPageTreeOptions;
}

type PartialUtilsOptions = Partial<UtilsOptions>;

interface RootConfig {
  languages: string[] | undefined;
  schema: {
    frontmatter: unknown;
    meta: unknown;
  };
}

export type Utils<TTypes extends RootConfig> = PageUtils<
  TTypes['schema']['frontmatter']
> & {
  tree: TTypes['languages'] extends string[]
    ? Record<string, PageTree>
    : PageTree;
  pages: Page<TTypes['schema']['frontmatter']>[];
  metas: Meta<TTypes['schema']['meta']>[];
};

type GetSchemaType<Schema, DefaultValue> = Schema extends AnyZodObject
  ? z.infer<Schema>
  : DefaultValue;

/**
 * Get accurate options type from partial options
 */
interface TransformPartialOptions<TOptions extends PartialUtilsOptions> {
  languages: TOptions['languages'] extends string[] ? string[] : undefined;
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

function fromMap<TOptions extends PartialUtilsOptions>(
  map: Record<string, unknown>,
  options?: TOptions,
): Utils<TransformPartialOptions<TOptions>> {
  type $Options = TransformPartialOptions<TOptions>;
  type $Frontmatter = $Options['schema']['frontmatter'];
  type $MetaData = $Options['schema']['meta'];
  type $Utils = Utils<$Options>;

  const {
    baseUrl = '/',
    rootDir = '',
    getSlugs,
    getUrl = createGetUrl(baseUrl),
    resolveIcon,
    pageTreeOptions = { root: '' },
    languages,
    schema,
  } = options ?? {};

  const resolved = resolveFiles<$Frontmatter, $MetaData>({
    map,
    rootDir,
    getSlugs,
    getUrl,
    schema,
  });

  const pageUtils = createPageUtils(resolved, languages ?? []);

  const builder = getPageTreeBuilder(
    resolved as ResolvedFiles<DefaultFrontmatter, DefaultMetaData>,
    {
      resolveIcon,
    },
  );

  const tree =
    languages === undefined
      ? builder.build(pageTreeOptions)
      : builder.buildI18n({
          ...pageTreeOptions,
          languages,
        });

  return {
    ...resolved,
    tree: tree as $Utils['tree'],
    ...pageUtils,
  };
}

export {
  fromMap,
  resolveFiles,
  createPageUtils,
  getPageTreeBuilder,
  defaultSchemas,
};
