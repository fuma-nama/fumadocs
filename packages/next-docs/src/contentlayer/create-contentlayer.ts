import type { BuildPageTreeOptions } from '@/server'
import type { PageTree } from '@/server/types'
import { loadContext, type ContextOptions } from './load-context'
import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { createUtils, type ContentlayerUtils } from './utils'

type Options<L extends string[] | undefined> = Partial<
  Omit<ContextOptions, 'languages'> & {
    /**
     * @default { root: 'docs' }
     */
    pageTreeOptions: BuildPageTreeOptions
    languages: L
  }
>

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
  tree: Langs extends string[] ? Record<string, PageTree> : PageTree
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
  const pageTreeOptions = options.pageTreeOptions ?? { root: 'docs' }

  return {
    __pageContext: ctx,
    tree: (options.languages != null
      ? ctx.builder.buildI18n({
          ...pageTreeOptions,
          languages: options.languages
        })
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx.builder.build(pageTreeOptions)) as any,
    ...createUtils(ctx)
  }
}
