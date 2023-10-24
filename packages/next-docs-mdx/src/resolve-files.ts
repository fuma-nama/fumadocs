import path from 'path'
import type { AnyZodObject } from 'zod'
import type { FileInfo, JsonExport, MDXExport, Meta, Page } from './types'
import { frontmatterSchema, metaSchema } from './validate/schema'

const pageTypes = ['.md', '.mdx']
const metaTypes = ['.json']

export type ResolvedFiles = {
  pages: Page[]
  metas: Meta[]
}

export type ResolveOptions = {
  map: Record<string, unknown>
  root: string
  validate?: ValidateOptions
}

export type ValidateOptions = Partial<{
  frontmatter: AnyZodObject
  meta: AnyZodObject
}>

export const defaultValidators = {
  frontmatter: frontmatterSchema,
  meta: metaSchema
}

function parsePath(p: string, prefix = './content'): FileInfo {
  const subPath = path.relative(prefix, p)
  const parsed = path.parse(subPath)
  const normalizedDirname = parsed.dir.replaceAll('\\', '/')
  let flattenedPath = normalizedDirname + '/' + parsed.name

  while (flattenedPath.startsWith('/')) {
    flattenedPath = flattenedPath.slice(1)
  }

  const [, locale] = parsed.name.split('.')

  return {
    id: subPath,
    dirname: normalizedDirname,
    base: parsed.base,
    name: parsed.name,
    flattenedPath,
    locale,
    type: parsed.ext,
    path: p
  }
}

function pathToSlugs(file: FileInfo, root: string): string[] {
  let path = file.flattenedPath

  if (path.startsWith(root)) {
    path = path.slice(root.length)
  }

  return path.split('/').filter(p => !['index', ''].includes(p))
}

function runValidate(
  schema: AnyZodObject,
  object: unknown,
  errorName: string
): boolean {
  const result = schema.safeParse(object)

  if (!result.success) {
    throw new Error(`Invalid ${errorName}: ${result.error}`)
  }

  return result.success
}

export function resolveFiles({
  map,
  root,
  validate = defaultValidators
}: ResolveOptions): ResolvedFiles {
  const metas: Meta[] = []
  const pages: Page[] = []

  for (const [path, v] of Object.entries(map)) {
    const file = parsePath(path)

    if (metaTypes.includes(file.type)) {
      const meta: Meta = {
        file,
        data: v as JsonExport
      }

      if (
        runValidate(
          validate.meta ?? defaultValidators.meta,
          meta.data,
          meta.file.path
        )
      ) {
        metas.push(meta)
      }

      continue
    }

    if (pageTypes.includes(file.type)) {
      const data = v as MDXExport
      const page: Page = {
        file,
        slugs: pathToSlugs(file, root),
        matter: data.frontmatter,
        data
      }

      if (
        runValidate(
          validate.frontmatter ?? defaultValidators.frontmatter,
          page.matter,
          page.file.path
        )
      ) {
        pages.push(page)
      }

      continue
    }

    console.warn('Unknown Type: ', file.type)
  }

  return {
    pages,
    metas
  }
}
