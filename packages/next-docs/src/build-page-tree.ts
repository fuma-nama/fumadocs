import type { ReactElement } from 'react'
import type { FileNode, FolderNode, PageTree, TreeNode } from './server/types'

export type File = {
  /**
   * Original path of file
   */
  path: string

  /**
   * File path without extension & prefix
   */
  flattenedPath: string

  /**
   * File name without extension
   */
  name: string

  dirname: string
}

export type AbstractMeta = {
  file: File
  icon?: string
  title?: string
  pages: string[]
}

export type AbstractPage = {
  file: File
  icon?: string
  title: string
  url: string
}

export type Context = {
  lang?: string

  getMetaByPath: (flattenPath: string) => AbstractMeta | null
  getPageByPath: (flattenPath: string) => AbstractPage | null

  resolveIcon: (icon: string) => ReactElement | undefined

  /**
   * Default pages without specified langauge
   */
  basePages: AbstractPage[]
}

type InternationalizedContext<Languages extends string> = Omit<
  Context,
  'lang'
> & {
  languages: Languages[]
}

export type Options = {
  /**
   * The root folder to scan files
   * @default 'docs'
   */
  root: string
}

const separator = /---(.*?)---/
const rest = '...'
const extractor = /\.\.\.(.+)/

function buildMeta(meta: AbstractMeta, ctx: Context): FolderNode {
  const segments = meta.file.dirname.split('/')
  let index: FileNode | undefined = undefined
  const filtered = new Set<string>()

  const resolved = meta.pages.flatMap<TreeNode | '...'>(item => {
    if (item === rest) return '...'

    const result = separator.exec(item)

    if (result != null)
      return {
        type: 'separator',
        name: result[1]
      }

    const extract_result = extractor.exec(item)
    const is_extract = extract_result != null

    if (extract_result != null) {
      item = extract_result[1]
    }

    const path = meta.file.dirname + '/' + item
    const page = ctx.getPageByPath(path)

    if (page != null) {
      const node = buildFileNode(page, ctx)
      filtered.add(page.file.path)

      if (item === 'index') index = node
      return node
    }

    //folder can't be index
    if (item === 'index') {
      return []
    }

    const node = buildFolderNode(path, ctx, is_extract)
    filtered.add(path)

    // if item doesn't exist
    if (node.index == null && node.children.length === 0) return []

    // extract children
    if (is_extract) return node.children

    return node
  })

  const children = resolved.flatMap<TreeNode>(item => {
    if (item === '...') {
      return getFolderNodes(
        ctx,
        meta.file.dirname,
        false,
        path => !filtered.has(path)
      ).children
    }

    return item
  })

  if (index == null) {
    const page = ctx.getPageByPath(meta.file.dirname + '/index')

    if (page != null) index = buildFileNode(page, ctx)
  }

  return {
    type: 'folder',
    name: meta.title ?? index?.name ?? pathToName(segments),
    icon: meta.icon ? ctx.resolveIcon(meta.icon) : undefined,
    index,
    children
  }
}

/**
 * Get nodes under specific folder
 * @param ctx Context
 * @param path Folder path
 * @param joinIndex If enabled, join index node into children
 * @param filter Filter nodes
 */
function getFolderNodes(
  ctx: Context,
  path: string,
  joinIndex: boolean,
  filter: (path: string) => boolean = () => true
): { index?: FileNode; children: TreeNode[] } {
  let index: FileNode | undefined
  const children: TreeNode[] = []

  for (const page of ctx.basePages) {
    if (page.file.dirname !== path || !filter(page.file.path)) continue
    const node = buildFileNode(page, ctx)

    if (page.file.name === 'index') {
      index = node
      continue
    }

    children.push(node)
  }

  const segments = path.split('/')
  const folders = new Set<string>(
    ctx.basePages.flatMap(page => {
      const dirnameSegments = page.file.dirname.split('/')

      if (path.length === 0 && path !== page.file.dirname)
        return dirnameSegments[0]
      if (page.file.dirname.startsWith(path + '/'))
        return path + '/' + dirnameSegments[segments.length]

      return []
    })
  )

  for (const folder of folders) {
    if (!filter(folder)) continue

    children.push(buildFolderNode(folder, ctx))
  }

  children.sort((next, prev) => next.name.localeCompare(prev.name))
  if (index && joinIndex) children.unshift(index)

  return { index, children }
}

function buildFileNode(page: AbstractPage, ctx: Context): FileNode {
  if (ctx.lang) {
    page = ctx.getPageByPath(page.file.flattenedPath + `.${ctx.lang}`) ?? page
  }

  return {
    type: 'page',
    name: page.title,
    icon: page.icon ? ctx.resolveIcon(page.icon) : undefined,
    url: page.url
  }
}

function buildFolderNode(
  path: string,
  ctx: Context,
  keepIndex: boolean = false
): FolderNode {
  let meta: AbstractMeta | null = null
  if (ctx.lang) meta = ctx.getMetaByPath(path + `/meta-${ctx.lang}`)
  meta ??= ctx.getMetaByPath(path + '/meta')

  if (meta != null) {
    return buildMeta(meta, ctx)
  }

  const { index, children } = getFolderNodes(ctx, path, keepIndex)

  return {
    type: 'folder',
    name: index?.name ?? pathToName(path.split('/')),
    index,
    children
  }
}

function build(root: string, ctx: Context): PageTree {
  const folder = buildFolderNode(root, ctx, true)

  return {
    name: folder.name,
    children: folder.children
  }
}

export function buildPageTree(
  context: Context,
  { root = 'docs' }: Partial<Options> = {}
): PageTree {
  return build(root, context)
}

/**
 * Build page tree and fallback to the default language if the page doesn't exist
 *
 * @param metas Meta files
 * @param docs Docs files
 * @param languages All supported languages
 */
export function buildI18nPageTree<Languages extends string = string>(
  { languages, ...context }: InternationalizedContext<Languages>,
  { root = 'docs' }: Partial<Options> = {}
): Record<Languages, PageTree> {
  const entries = languages.map(lang => {
    const tree = build(root, {
      ...context,
      lang
    })

    return [lang, tree]
  })

  return Object.fromEntries(entries)
}

function pathToName(path: string[]): string {
  const name = path[path.length - 1] ?? 'docs'
  return name.slice(0, 1).toUpperCase() + name.slice(1)
}
