import path from 'node:path';
import { AnyZodObject, z, ZodError } from 'zod';
import type { VirtualFile } from 'fumadocs-core/source';
import type { MDXExport, MDXPageData } from './types';
import { defaultSchemas } from './utils/schema';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json'];

interface ResolveOptions {
  map: Record<string, unknown>;

  rootDir?: string;

  /**
   * Zod schema for frontmatter/meta, transform allowed
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

class DataError extends Error {
  constructor(name: string, error: ZodError) {
    const info = error.flatten();

    super(
      `${name}: ${JSON.stringify(
        {
          root: info.formErrors,
          ...info.fieldErrors,
        },
        null,
        2,
      )}`,
    );
    this.name = 'DataError';
  }
}

function parse<T extends AnyZodObject>(
  schema: T,
  object: unknown,
  errorName: string,
): z.infer<T> {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new DataError(errorName, result.error);
  }

  return result.data;
}

export function resolveFiles({
  map,
  rootDir = '',
  schema = {},
}: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const [file, value] of Object.entries(map)) {
    if (!file.startsWith(rootDir)) continue;
    const parsed = path.parse(file);

    if (metaTypes.includes(parsed.ext)) {
      outputs.push({
        type: 'meta',
        path: file,
        data: parse(
          schema.meta ?? defaultSchemas.meta,
          value,
          `Invalid meta file in ${file}`,
        ),
      });

      continue;
    }

    if (pageTypes.includes(parsed.ext)) {
      const { frontmatter, ...data } = value as MDXExport;
      const parsedFrontmatter = parse(
        schema.frontmatter ?? defaultSchemas.frontmatter,
        frontmatter,
        `Invalid Frontmatter in ${file}`,
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
