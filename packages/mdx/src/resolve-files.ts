import path from 'node:path';
import { joinPaths, splitPath } from 'next-docs-zeta/server';
import type { AnyZodObject } from 'zod';
import type { FileInfo, MDXExport, Meta, Page } from './types';
import {
  frontmatterSchema,
  metaSchema,
  type Frontmatter,
  type MetaExport,
} from './validate/schema';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json'];

export interface ResolvedFiles {
  pages: Page[];
  metas: Meta[];
}

export interface ResolveOptions {
  map: Record<string, unknown>;

  /**
   * root directory to resolve files, all slugs will be relative to the root directory
   *
   * @defaultValue `''`
   */
  rootDir?: string;

  /**
   * Generate slugs from file info
   */
  getSlugs?: (file: FileInfo) => string[];

  /**
   * Check frontmatter/meta objects, transform allowed
   */
  validate?: ValidateOptions;

  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string;
}

type ValidateOptions = Partial<{
  frontmatter: AnyZodObject;
  meta: AnyZodObject;
}>;

export const defaultValidators = {
  frontmatter: frontmatterSchema,
  meta: metaSchema,
};

function parsePath(p: string, root = ''): FileInfo | false {
  if (!p.startsWith(root)) return false;
  const relativePath = splitPath(p.substring(root.length)).join('/');

  const parsed = path.parse(relativePath);
  const normalizedDirname = parsed.dir.replace('\\', '/');
  const flattenedPath = joinPaths([normalizedDirname, parsed.name]);
  const [, locale] = parsed.name.split('.');

  return {
    id: p,
    dirname: normalizedDirname,
    base: parsed.base,
    name: parsed.name,
    flattenedPath,
    locale,
    type: parsed.ext,
    path: relativePath,
  };
}

function pathToSlugs(file: FileInfo): string[] {
  return file.flattenedPath
    .split('/')
    .filter((p) => !['index', ''].includes(p));
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
  getSlugs = pathToSlugs,
  getUrl,
  rootDir = '',
  validate = defaultValidators,
}: ResolveOptions): ResolvedFiles {
  const metas: Meta[] = [];
  const pages: Page[] = [];

  for (const [key, value] of Object.entries(map)) {
    const file = parsePath(key, rootDir);
    if (file === false) continue;

    if (metaTypes.includes(file.type)) {
      const meta: Meta = {
        file,
        data: parse<MetaExport>(
          validate.meta ?? defaultValidators.meta,
          value,
          file.path,
        ),
      };

      metas.push(meta);

      continue;
    }

    if (pageTypes.includes(file.type)) {
      const data = value as MDXExport;
      const slugs = getSlugs(file);

      const page: Page = {
        file,
        slugs,
        url: getUrl(slugs, file.locale),
        matter: parse<Frontmatter>(
          validate.frontmatter ?? defaultValidators.frontmatter,
          data.frontmatter,
          file.path,
        ),
        data,
      };

      pages.push(page);

      continue;
    }

    console.warn('Unknown Type: ', file.type);
  }

  return {
    pages,
    metas,
  };
}
