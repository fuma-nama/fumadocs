import { allDocs, allMeta } from 'contentlayer/generated'
import { createUtils, loadContext } from 'next-docs-zeta/contentlayer'
import type { PageTree } from 'next-docs-zeta/server'

const ctx = loadContext(allMeta, allDocs)

const uiTree = ctx.builder.build({ root: 'docs/ui' })

const headlessTree = ctx.builder.build({
  root: 'docs/headless'
})

export function getTree(mode: 'ui' | 'headless' | string): PageTree {
  if (mode === 'ui') {
    return uiTree
  }

  return headlessTree
}

export const { getPage, getPageUrl } = createUtils(ctx)
