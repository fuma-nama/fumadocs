import path from 'node:path';
import { joinPaths, splitPath } from 'next-docs-zeta/server';
import type { AnyZodObject } from 'zod';
import type { FileInfo, MDXExport, Meta, Page } from './types';
import { defaultSchemas } from './validate/schema';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json'];

export interface ResolvedFiles<Frontmatter, MetaData> {
  pages: Page<Frontmatter>[];
  metas: Meta<MetaData>[];
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
   * Zod schema for frontmatter/meta objects, transform allowed
   */
  schema?: Partial<SchemaOptions>;

  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string;
}

export interface SchemaOptions {
  frontmatter: AnyZodObject;
  meta: AnyZodObject;
}

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

export function resolveFiles<Frontmatter, MetaData>({
  map,
  getSlugs = pathToSlugs,
  getUrl,
  rootDir = '',
  schema = defaultSchemas,
}: ResolveOptions): ResolvedFiles<Frontmatter, MetaData> {
  type $Meta = Meta<MetaData>;
  type $Page = Page<Frontmatter>;

  const metas: $Meta[] = [];
  const pages: $Page[] = [];

  for (const [key, value] of Object.entries(map)) {
    const file = parsePath(key, rootDir);
    if (file === false) continue;

    if (metaTypes.includes(file.type)) {
      const meta: $Meta = {
        file,
        data: parse(schema.meta ?? defaultSchemas.meta, value, file.path),
      };

      metas.push(meta);

      continue;
    }

    if (pageTypes.includes(file.type)) {
      const data = value as MDXExport<Frontmatter>;
      const slugs = getSlugs(file);

      const page: $Page = {
        file,
        slugs,
        url: getUrl(slugs, file.locale),
        matter: parse(
          schema.frontmatter ?? defaultSchemas.frontmatter,
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
