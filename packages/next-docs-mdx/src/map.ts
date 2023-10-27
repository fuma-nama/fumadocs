import type { PageTree } from 'next-docs-zeta/server'
import { getPageTreeBuilder, type BuilderOptions } from './build-tree'
import { createPageUtils, type PageUtils } from './page-utils'
import {
  defaultValidators,
  resolveFiles,
  type ValidateOptions
} from './resolve-files'
import type { Meta, Page } from './types'

type UtilsOptions<Langs extends string[] | undefined> = {
  languages: Langs

  /**
   * @default '/docs'
   */
  baseUrl: string

  /**
   * @deprecated Use `rootDir` instead
   */
  root: string

  /**
   * Root directory, files outside of the root directory will be ignored
   *
   * @default ''
   */
  rootDir: string

  validate: ValidateOptions
} & BuilderOptions

type Utils = PageUtils & {
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
    getUrl,
    resolveIcon,
    languages,
    validate
  }: Partial<UtilsOptions<Langs>> = {}
): Langs extends string[] ? I18nUtils : Utils {
  const resolved = resolveFiles({
    map,
    rootDir,
    validate
  })

  const pageUtils = createPageUtils(resolved, baseUrl, languages ?? [])
  if (getUrl) pageUtils.getPageUrl = getUrl

  const builder = getPageTreeBuilder(resolved, {
    getUrl: pageUtils.getPageUrl,
    resolveIcon
  })

  return {
    ...resolved,
    ...pageUtils,
    tree: (languages == null
      ? builder.build({ root: rootDir })
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        builder.buildI18n({ languages, root: rootDir })) as any
  }
}

export {
  fromMap,
  resolveFiles,
  createPageUtils,
  getPageTreeBuilder,
  defaultValidators
}
