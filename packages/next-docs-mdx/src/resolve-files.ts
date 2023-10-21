import path from 'path'
import type { FileInfo, JsonExport, MDXExport, Meta, Page } from './types'

const pageTypes = ['.md', '.mdx']
const metaTypes = ['.json']

export type ResolvedFiles = {
  pages: Page[]
  metas: Meta[]
}

function parsePath(p: string, prefix = './content'): FileInfo {
  const subPath = path.relative(prefix, p)
  const parsed = path.parse(subPath)
  let flattenedPath = parsed.dir + '/' + parsed.name

  while (flattenedPath.startsWith('/')) {
    flattenedPath = flattenedPath.slice(1)
  }

  const [, locale] = parsed.name.split('.')

  return {
    id: subPath,
    dirname: parsed.dir,
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

export type ResolveOptions = {
  map: Record<string, unknown>
  root: string
}

export function resolveFiles({ map, root }: ResolveOptions): ResolvedFiles {
  const metas: Meta[] = []
  const pages: Page[] = []

  for (const [k, v] of Object.entries(map)) {
    const path = parsePath(k)

    if (metaTypes.includes(path.type)) {
      metas.push({
        file: path,
        data: v as JsonExport
      })

      continue
    }

    if (pageTypes.includes(path.type)) {
      const data = v as MDXExport

      pages.push({
        file: path,
        slugs: pathToSlugs(path, root),
        matter: data.frontmatter,
        data
      })

      continue
    }

    console.warn('Unknown Type: ', path.type)
  }

  return {
    pages,
    metas
  }
}
