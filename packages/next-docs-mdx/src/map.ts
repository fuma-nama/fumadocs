import {
  buildI18nPageTree,
  buildPageTree
} from 'next-docs-zeta/build-page-tree'
import type { PageTree } from 'next-docs-zeta/server'
import { loadContext, type ContextOptions } from './build-tree'
import { createPageUtils, type PageUtils } from './page-utils'
import { resolveFiles } from './resolve-files'
import type { Meta, Page } from './types'

type UtilsOptions = {
  /**
   * @default '/docs'
   */
  baseUrl: string

  /**
   * Where to scan nodes
   * @default 'docs'
   */
  root: string
} & ContextOptions

type I18nUtilsOptions = UtilsOptions & {
  languages: string[]
}

type Utils = PageUtils & {
  tree: PageTree
  pages: Page[]
  metas: Meta[]
}

type I18nUtils = Omit<Utils, 'tree'> & {
  tree: Record<string, PageTree>
}

function fromMapI18n(
  map: Record<string, unknown>,
  {
    baseUrl = '/docs',
    root = 'docs',
    getUrl,
    resolveIcon,
    languages = []
  }: Partial<I18nUtilsOptions> = {}
): I18nUtils {
  const context = resolveFiles({
    root,
    map
  })

  const pageUtils = createPageUtils(context, baseUrl, languages)

  const pageTreeContext = loadContext(context.metas, context.pages, {
    getUrl: getUrl ?? pageUtils.getPageUrl,
    resolveIcon
  })

  return {
    ...context,
    ...pageUtils,
    getPageUrl: getUrl ?? pageUtils.getPageUrl,
    tree: buildI18nPageTree({ languages, ...pageTreeContext }, { root })
  }
}

function fromMap(
  map: Record<string, unknown>,
  {
    baseUrl = '/docs',
    root = 'docs',
    getUrl,
    resolveIcon
  }: Partial<UtilsOptions> = {}
): Utils {
  const context = resolveFiles({
    map,
    root
  })

  const pageUtils = createPageUtils(context, baseUrl, [])

  const pageTreeContext = loadContext(context.metas, context.pages, {
    getUrl: getUrl ?? pageUtils.getPageUrl,
    resolveIcon
  })

  return {
    ...context,
    ...pageUtils,
    getPageUrl: getUrl ?? pageUtils.getPageUrl,
    tree: buildPageTree(pageTreeContext, { root })
  }
}

export { fromMap, fromMapI18n }
