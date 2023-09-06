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

function buildMeta(meta: MetaPageBase, ctx: Context): FolderNode {
  const segments = meta._raw.sourceFileDir.split('/')
  let index: FileNode | undefined = undefined

  const children = meta.pages.flatMap<TreeNode>(item => {
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

      if (item === 'index') index = node
      return node
    }

    //folder can't be index
    if (item === 'index') {
      return []
    }

    const node = buildFolderNode(path, ctx)

    // if item doesn't exist
    if (node.index == null && node.children.length === 0) return []

    return node
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
  let index: FileNode | undefined = undefined

  const pages = ctx.pages.get(ctx.lang ?? '') ?? []

  const children: TreeNode[] = []

  for (const page of pages) {
    if (page._raw.sourceFileDir !== path) continue
    const node = buildFileNode(page, ctx)

    if (page._raw.flattenedPath === path) {
      index = node
      continue
    }

    children.push(node)
  }

  const folders = new Set<string>(
    pages
      .filter(
        page =>
          page._raw.sourceFileDir.startsWith(path + '/') &&
          page._raw.sourceFileDir.split('/').length === segments.length + 1
      )
      .map(page => page._raw.sourceFileDir)
  )

  for (const folder of folders) {
    children.push(buildFolderNode(folder, ctx))
  }

  children.sort((next, prev) => next.name.localeCompare(prev.name))
  if (keepIndex && index) children.unshift(index)

  return {
    name:
      index != null
        ? (index as FileNode).name
        : pathToName(segments[segments.length - 1] ?? 'docs'),
    type: 'folder',
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
