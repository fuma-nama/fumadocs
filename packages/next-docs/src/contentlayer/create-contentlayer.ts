import { buildI18nPageTree, buildPageTree } from '@/build-page-tree'
import type { PageTree } from '@/server/types'
import { loadContext, type ContextOptions } from './load-context'
import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { createUtils, type ContentlayerUtils } from './utils'

type Options<L extends string[] | undefined> = Omit<
  Partial<ContextOptions>,
  'languages'
> & {
  languages?: L
}

type CreateContentlayer = <
  Meta extends MetaPageBase,
  Docs extends DocsPageBase,
  Langs extends string[] | undefined = undefined
>(
  metaPages: Meta[],
  docsPages: Docs[],
  options?: Options<Langs>
) => {
  __pageContext: PagesContext
  tree: Langs extends string[] ? Record<Langs[number], PageTree> : PageTree
} & ContentlayerUtils<Docs>

/**
 * Create page tree and utilities for Contentlayer
 */
export const createContentlayer: CreateContentlayer = (
  metaPages,
  docsPages,
  options = {}
) => {
  const ctx = loadContext(metaPages, docsPages, options)

  return {
    __pageContext: ctx,
    tree: (options.languages != null
      ? buildI18nPageTree({ ...ctx, languages: options.languages })
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildPageTree(ctx)) as any,
    ...createUtils(ctx)
  }
}
