import path from 'path'
import type { MDXProps } from 'mdx/types'
import type { StructuredData } from 'next-docs-zeta/mdx-plugins'
import type { PageTree, TableOfContents, TreeNode } from 'next-docs-zeta/server'

type Page<T extends MDXExport = MDXExport> = {
  file: FileInfo
  slugs: string[]
  data: T
  matter: T['frontmatter']
}

/**
 * Defalt MDX properties, feel free to extend
 */
export type MDXExport = {
  default(props: MDXProps): JSX.Element
  frontmatter: {
    title: string
    description: string
  }
  toc: TableOfContents
  structuredData: StructuredData
}

type UtilsOptions = {
  /**
   * @default '/docs'
   */
  baseUrl?: string
}

type Utils<T extends MDXExport> = {
  tree: PageTree
  getPage(slugs: string | string[] | undefined): Page<T> | null
  getPageUrl(slugs: string | string[] | undefined): string
  pages: Page<T>[]
}

type UtilsContext<T extends MDXExport> = Pick<
  Utils<T>,
  'getPageUrl' | 'pages' | 'getPage'
>

type FileInfo = {
  /**
   * Directories of file
   */
  dirname: string

  /**
   * File name with extension
   */
  base: string

  /**
   * File name without extension
   */
  name: string

  /**
   * Original path, should be relative to cwd
   */
  path: string

  /**
   * A flatten path without extensions and prefixes, like `dir/file`
   */
  flattenedPath: string

  id: string
}

function parsePath(p: string, prefix = './content'): FileInfo {
  const subPath = path.relative(prefix, p)
  const parsed = path.parse(subPath)
  let flattenedPath = parsed.dir + '/' + parsed.name

  while (flattenedPath.startsWith('/')) {
    flattenedPath = flattenedPath.slice(1)
  }

  return {
    id: subPath,
    dirname: parsed.dir,
    base: parsed.base,
    name: parsed.name,
    flattenedPath,
    path: p
  }
}

function pathToSlugs(file: FileInfo): string[] {
  return file.flattenedPath.split('/').filter(p => !['index'].includes(p))
}

function slugsToUrl(slugs: string[] = []): string {
  return slugs.join('/')
}

type RawTreeNode<T extends MDXExport> = TreeNode & {
  page: T
}

function buildPageTree<T extends MDXExport>({
  getPageUrl,
  pages
}: UtilsContext<T>): PageTree {
  const treeMap = new Map<string, RawTreeNode<T>[]>()

  for (const page of pages) {
    if (!treeMap.has(page.file.dirname)) {
      treeMap.set(page.file.dirname, [])
    }

    treeMap.get(page.file.dirname)!.push({
      type: 'page',
      name: page.matter.title,
      url: getPageUrl(page.slugs),
      page: page.data
    })
  }

  return {
    name: 'Docs',
    children: [...treeMap.values()].flatMap(nodes => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return nodes.map(({ page, ...node }) => {
        return node
      })
    })
  }
}

function getPage<T extends MDXExport>(
  pages: Page<T>[],
  _slugs: string | string[] = []
): Page<T> | null {
  let slugs = ''
  if (typeof _slugs === 'string') slugs = _slugs
  if (Array.isArray(_slugs)) slugs = _slugs.join('/')

  const result = pages.find(page => page.slugs.join('/') === slugs)

  return result ?? null
}

function fromMap<T extends MDXExport = MDXExport>(
  map: Record<string, unknown>,
  { baseUrl = '/docs' }: UtilsOptions = {}
): Utils<T> {
  const pages = Object.entries(map).map<Page<T>>(([k, v]) => {
    const path = parsePath(k)
    const data = v as T

    return {
      file: path,
      slugs: pathToSlugs(path),
      matter: data.frontmatter,
      data
    }
  })

  const context: UtilsContext<T> = {
    getPageUrl: (slugs = []) => {
      const slugsArray = typeof slugs === 'string' ? slugs.split('/') : slugs

      return slugsToUrl([baseUrl, ...slugsArray])
    },
    getPage: slugs => getPage(pages, slugs),
    pages
  }

  return {
    ...context,
    tree: buildPageTree<T>(context)
  }
}

export { fromMap, getPage, slugsToUrl, buildPageTree }
