import {
  createGetUrl,
  type BuildPageTreeOptions,
  type PageTree
} from 'next-docs-zeta/server'
import { getPageTreeBuilder, type BuilderOptions } from './build-tree'
import { createPageUtils, type PageUtils } from './page-utils'
import {
  defaultValidators,
  resolveFiles,
  type ResolveOptions
} from './resolve-files'
import type { Meta, Page } from './types'

type UtilsOptions<Langs extends string[] | undefined> = {
  languages: Langs

  /**
   * @default '/docs'
   */
  baseUrl: string

  pageTreeOptions: BuildPageTreeOptions
} & BuilderOptions &
  Pick<ResolveOptions, 'getSlugs' | 'getUrl' | 'validate' | 'rootDir'>

export type Utils = PageUtils & {
  tree: PageTree
  pages: Page[]
  metas: Meta[]
}

type I18nUtils = Omit<Utils, 'tree'> & {
  tree: Record<string, PageTree>
}

function fromMap<Langs extends string[] | undefined = undefined>(
  map: Record<string, unknown>,
  {
    baseUrl = '/docs',
    rootDir = '',
    getSlugs,
    getUrl = createGetUrl(baseUrl),
    resolveIcon,
    pageTreeOptions = { root: '' },
    languages,
    validate
  }: Partial<UtilsOptions<Langs>> = {}
): Langs extends string[] ? I18nUtils : Utils {
  const resolved = resolveFiles({
    map,
    rootDir,
    getSlugs,
    getUrl,
    validate
  })

  const pageUtils = createPageUtils(resolved, languages ?? [])

  const builder = getPageTreeBuilder(resolved, {
    resolveIcon
  })

  return {
    ...resolved,
    ...pageUtils,
    tree: (languages == null
      ? builder.build(pageTreeOptions)
      : builder.buildI18n({
          ...pageTreeOptions,
          languages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any
  }
}

export {
  fromMap,
  resolveFiles,
  createPageUtils,
  getPageTreeBuilder,
  defaultValidators
}
