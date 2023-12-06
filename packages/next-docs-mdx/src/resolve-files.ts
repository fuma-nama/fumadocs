import path from 'path'
import type { AnyZodObject } from 'zod'
import type { FileInfo, MDXExport, Meta, Page } from './types'
import {
  frontmatterSchema,
  metaSchema,
  type Frontmatter,
  type MetaExport
} from './validate/schema'

const pageTypes = ['.md', '.mdx']
const metaTypes = ['.json']

export type ResolvedFiles = {
  pages: Page[]
  metas: Meta[]
}

export type ResolveOptions = {
  map: Record<string, unknown>

  /**
   * root directory to resolve files
   *
   * @default ''
   */
  rootDir?: string

  /**
   * Generate slugs from file info
   */
  getSlugs?: (file: FileInfo) => string[]

  /**
   * Check frontmatter/meta objects, transform allowed
   */
  validate?: ValidateOptions

  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string
}

type ValidateOptions = Partial<{
  frontmatter: AnyZodObject
  meta: AnyZodObject
}>

export const defaultValidators = {
  frontmatter: frontmatterSchema,
  meta: metaSchema
}

function parsePath(p: string): FileInfo {
  const parsed = path.parse(p)
  const normalizedDirname = parsed.dir.replaceAll('\\', '/')
  let flattenedPath = normalizedDirname + '/' + parsed.name

  while (flattenedPath.startsWith('/')) {
    flattenedPath = flattenedPath.slice(1)
  }

  const [, locale] = parsed.name.split('.')

  return {
    id: p,
    dirname: normalizedDirname,
    base: parsed.base,
    name: parsed.name,
    flattenedPath,
    locale,
    type: parsed.ext,
    path: p
  }
}

function pathToSlugs(file: FileInfo): string[] {
  return file.flattenedPath.split('/').filter(p => !['index', ''].includes(p))
}

function parse<T>(schema: AnyZodObject, object: unknown, errorName: string): T {
  const result = schema.safeParse(object)

  if (!result.success) {
    throw new Error(`Invalid ${errorName}: ${result.error}`)
  }

  return result.data as T
}

export function resolveFiles({
  map,
  getSlugs = pathToSlugs,
  getUrl,
  rootDir = '',
  validate = defaultValidators
}: ResolveOptions): ResolvedFiles {
  const metas: Meta[] = []
  const pages: Page[] = []

  for (const [path, v] of Object.entries(map)) {
    const file = parsePath(path)
    if (
      rootDir.length > 0 &&
      file.dirname != rootDir &&
      !file.dirname.startsWith(rootDir + '/')
    )
      continue

    if (metaTypes.includes(file.type)) {
      const meta: Meta = {
        file,
        data: parse<MetaExport>(
          validate.meta ?? defaultValidators.meta,
          v,
          file.path
        )
      }

      metas.push(meta)

      continue
    }

    if (pageTypes.includes(file.type)) {
      const data = v as MDXExport
      const slugs = getSlugs(file)

      const page: Page = {
        file,
        slugs,
        url: getUrl(slugs, file.locale),
        matter: parse<Frontmatter>(
          validate.frontmatter ?? defaultValidators.frontmatter,
          data.frontmatter,
          file.path
        ),
        data
      }

      pages.push(page)

      continue
    }

    console.warn('Unknown Type: ', file.type)
  }

  return {
    pages,
    metas
  }
}
