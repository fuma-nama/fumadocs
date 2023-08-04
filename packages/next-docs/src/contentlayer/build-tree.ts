import type { FileNode, FolderNode, TreeNode } from '../server'
import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { getPageUrl as defaultGetUrl, getKey, pathToName } from './utils'

type Context = PagesContext & {
  getUrl: (slug: string, locale?: string) => string
  lang?: string
}

type Options = {
  /**
   * The root folder to scan files
   * @default 'docs'
   */
  root: string
  /**
   * Base URL of documents
   * @default "/docs"
   */
  baseUrl: string

  /**
   * Get page url from slug and locale
   *
   * @default '/baseUrl/locale/slug'
   */
  getUrl: (slug: string[], baseUrl: string, locale?: string) => string
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
    url: ctx.getUrl(page.slug, ctx.lang),
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

  // files under the directory
  const children: TreeNode[] = pages
    .filter(page => page._raw.sourceFileDir === path)
    .flatMap(page => {
      const node = buildFileNode(page, ctx)

      if (page._raw.flattenedPath === path) {
        index = node
        if (!keepIndex) return []
      }

      return node
    })

  // find folders under the directory
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

function build(root: string, ctx: Context): TreeNode[] {
  const folder = buildFolderNode(root, ctx, true)

  return folder?.children ?? []
}

export function buildPageTree(
  context: PagesContext,
  {
    root = 'docs',
    baseUrl = '/docs',
    getUrl = defaultGetUrl
  }: Partial<Options> = {}
): TreeNode[] {
  return build(root, {
    ...context,
    getUrl: (slug, locale) => {
      return getUrl(slug.split('/'), baseUrl, locale)
    }
  })
}

/**
 * Build page tree and fallback to the default language if the page doesn't exist
 *
 * @param metas Meta files
 * @param docs Docs files
 * @param languages All supported languages
 */
export function buildI18nPageTree<Languages extends string>(
  context: PagesContext,
  languages: Languages[],
  {
    root = 'docs',
    baseUrl = '/docs',
    getUrl = defaultGetUrl
  }: Partial<Options> = {}
): Record<Languages, TreeNode[]> {
  const entries = languages.map(lang => {
    const tree = build(root, {
      ...context,
      lang,
      getUrl: (slug, locale) => {
        return getUrl(slug.split('/'), baseUrl, locale)
      }
    })

    return [lang, tree]
  })

  return Object.fromEntries(entries)
}
