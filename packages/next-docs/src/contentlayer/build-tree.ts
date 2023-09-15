import type { FileNode, FolderNode, PageTree, TreeNode } from '../server'
import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { getKey, pathToName } from './utils'

type Context = PagesContext & {
  lang?: string
}

type Options = {
  /**
   * The root folder to scan files
   * @default 'docs'
   */
  root: string
}

const separator = /---(.*?)---/
const rest = '...'

function buildMeta(meta: MetaPageBase, ctx: Context): FolderNode {
  const segments = meta._raw.sourceFileDir.split('/')
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

    const path = meta._raw.sourceFileDir + '/' + item
    const page = ctx.docsMap.get(path)

    if (page != null) {
      const node = buildFileNode(page, ctx)
      filtered.add(page._raw.sourceFilePath)

      if (item === 'index') index = node
      return node
    }

    //folder can't be index
    if (item === 'index') {
      return []
    }

    const node = buildFolderNode(path, ctx)
    filtered.add(path)

    // if item doesn't exist
    if (node.index == null && node.children.length === 0) return []

    return node
  })

  const children = resolved.flatMap<TreeNode>(item => {
    if (item === '...') {
      const nodes = getFolderNodes(
        ctx,
        meta._raw.sourceFileDir,
        true,
        path => !filtered.has(path)
      )

      return nodes.children
    }

    return item
  })

  if (index == null) {
    const page = ctx.docsMap.get(meta._raw.sourceFileDir + '/index')

    if (page != null) index = buildFileNode(page, ctx)
  }

  return {
    name: meta.title ?? pathToName(segments[segments.length - 1] ?? 'docs'),
    index,
    type: 'folder',
    icon: meta.icon && ctx.resolveIcon ? ctx.resolveIcon(meta.icon) : undefined,
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
): { index: FileNode | null; children: TreeNode[] } {
  const pages = ctx.pages.get(ctx.lang ?? '') ?? []
  let index: FileNode | null = null
  const children: TreeNode[] = []

  for (const page of pages) {
    if (page._raw.sourceFileDir !== path || !filter(page._raw.sourceFilePath))
      continue
    const node = buildFileNode(page, ctx)

    if (page._raw.flattenedPath === path) {
      index = node
      continue
    }

    children.push(node)
  }

  const segmentIndex = path.split('/').length
  const folders = new Set<string>(
    pages
      .filter(page => page._raw.sourceFileDir.startsWith(path + '/'))
      .map(
        page => path + '/' + page._raw.sourceFileDir.split('/')[segmentIndex]
      )
  )

  for (const folder of folders) {
    if (!filter(folder)) continue

    console.log('s', folder)
    children.push(buildFolderNode(folder, ctx))
  }

  children.sort((next, prev) => next.name.localeCompare(prev.name))
  if (index && joinIndex) children.unshift(index)

  return { index, children }
}

function buildFileNode(page: DocsPageBase, ctx: Context): FileNode {
  if (ctx.lang) {
    page = ctx.docsMap.get(getKey(page) + `.${ctx.lang}`) ?? page
  }

  return {
    type: 'page',
    name: page.title,
    url: ctx.getUrl(page.slug.split('/'), ctx.lang),
    icon: page.icon && ctx.resolveIcon ? ctx.resolveIcon(page.icon) : undefined
  }
}

function buildFolderNode(
  path: string,
  ctx: Context,
  keepIndex: boolean = false
): FolderNode {
  let meta = ctx.lang ? ctx.metaMap.get(path + `/meta-${ctx.lang}`) : null
  meta ??= ctx.metaMap.get(path + '/meta')

  if (meta != null) {
    return buildMeta(meta, ctx)
  }

  const segments = path.split('/')
  const { index, children } = getFolderNodes(ctx, path, keepIndex)

  return {
    name:
      index != null
        ? (index as FileNode).name
        : pathToName(segments[segments.length - 1] ?? 'docs'),
    type: 'folder',
    index: index ?? undefined,
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
  context: PagesContext,
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
  context: PagesContext,
  { root = 'docs' }: Partial<Options> = {}
): Record<Languages, PageTree> {
  const entries = context.languages.map(lang => {
    const tree = build(root, {
      ...context,
      lang
    })

    return [lang, tree]
  })

  return Object.fromEntries(entries)
}
