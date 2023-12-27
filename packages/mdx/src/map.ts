import { type Source } from 'next-docs-zeta/source';
import type { z } from 'zod';
import { resolveFiles } from './resolve-files';
import type { defaultSchemas } from './validate/schema';
import type { MDXPageData } from './types';

interface UtilsOptions<Frontmatter, Meta> {
  schema?: {
    frontmatter?: Frontmatter;
    meta?: Meta;
  };
}

export function createMDXSource<
  Frontmatter extends
    (typeof defaultSchemas)['frontmatter'] = (typeof defaultSchemas)['frontmatter'],
  Meta extends
    (typeof defaultSchemas)['meta'] = (typeof defaultSchemas)['meta'],
>(
  map: Record<string, unknown>,
  options?: UtilsOptions<Frontmatter, Meta>,
): Source<{
  metaData: z.infer<Meta>;
  pageData: MDXPageData<z.infer<Frontmatter>>;
}> {
  const files = resolveFiles({ map, schema: options?.schema });

  return {
    files,
  };
}

export { defaultSchemas } from './validate/schema';
