import path from 'node:path';
import type { AnyZodObject, z } from 'zod';
import type { VirtualFile } from 'next-docs-zeta/source';
import type { MDXExport, MDXPageData } from './types';
import { defaultSchemas } from './validate/schema';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json'];

interface ResolveOptions {
  map: Record<string, unknown>;

  /**
   * Zod schema for frontmatter/meta objects, transform allowed
   */
  schema?: SchemaOptions;
}

export interface SchemaOptions<
  Frontmatter = (typeof defaultSchemas)['frontmatter'],
  Meta = (typeof defaultSchemas)['meta'],
> {
  frontmatter?: Frontmatter;
  meta?: Meta;
}

function parse<T extends AnyZodObject>(
  schema: T,
  object: unknown,
  errorName: string,
): z.infer<T> {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new Error(`Invalid ${errorName}: ${result.error.toString()}`);
  }

  return result.data;
}

export function resolveFiles({
  map,
  schema = {},
}: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const [file, value] of Object.entries(map)) {
    const parsed = path.parse(file);

    if (metaTypes.includes(parsed.ext)) {
      outputs.push({
        type: 'meta',
        path: file,
        data: parse(schema.meta ?? defaultSchemas.meta, value, file),
      });

      continue;
    }

    if (pageTypes.includes(parsed.ext)) {
      const { frontmatter, ...data } = value as MDXExport;
      const parsedFrontmatter = parse(
        schema.frontmatter ?? defaultSchemas.frontmatter,
        frontmatter,
        file,
      );

      outputs.push({
        type: 'page',
        path: file,
        data: {
          ...parsedFrontmatter,
          exports: data,
        } satisfies MDXPageData,
      });

      continue;
    }

    console.warn('Unknown Type:', parsed.ext);
  }

  return outputs;
}
