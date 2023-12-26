import path from 'node:path';
import type { AnyZodObject } from 'zod';
import type { PageData, VirtualFile } from 'next-docs-zeta/source';
import type { MDXExport, MDXPageData } from './types';
import { defaultSchemas } from './validate/schema';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json'];

export interface ResolveOptions {
  map: Record<string, unknown>;

  /**
   * Zod schema for frontmatter/meta objects, transform allowed
   */
  schema?: Partial<SchemaOptions>;
}

export interface SchemaOptions {
  frontmatter: AnyZodObject;
  meta: AnyZodObject;
}

function parse<T>(schema: AnyZodObject, object: unknown, errorName: string): T {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new Error(`Invalid ${errorName}: ${result.error.toString()}`);
  }

  return result.data as T;
}

export function resolveFiles({
  map,
  schema = defaultSchemas,
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
      const parsedFrontmatter = parse<PageData>(
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
