import { type Source } from 'next-docs-zeta/source';
import type { z } from 'zod';
import { resolveFiles } from './resolve-files';
import type { defaultSchemas } from './validate/schema';
import type { MDXPageData, SourceFile } from './types';

interface UtilsOptions<Frontmatter, Meta> {
  schema?: {
    frontmatter?: Frontmatter;
    meta?: Meta;
  };
}

type DefaultFrontmatter = (typeof defaultSchemas)['frontmatter'];
type DefaultMeta = (typeof defaultSchemas)['meta'];

export function createMDXSource<
  Frontmatter extends DefaultFrontmatter = DefaultFrontmatter,
  Meta extends DefaultMeta = DefaultMeta,
>(
  map: Record<string, unknown>,
  options?: UtilsOptions<Frontmatter, Meta>,
): Source<{
  metaData: z.infer<Meta>;
  pageData: MDXPageData<z.infer<Frontmatter>>;
}> {
  return {
    files: loadMDXSource(map, options),
  };
}

export function loadMDXSource<
  Frontmatter extends DefaultFrontmatter = DefaultFrontmatter,
  Meta extends DefaultMeta = DefaultMeta,
>(
  map: Record<string, unknown>,
  options?: UtilsOptions<Frontmatter, Meta>,
): SourceFile<z.infer<Meta>, z.infer<Frontmatter>>[] {
  return resolveFiles({ map, schema: options?.schema }) as ReturnType<
    typeof loadMDXSource
  >;
}
