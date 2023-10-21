import { allDocs, allMeta } from 'contentlayer/generated'
import { buildPageTree } from 'next-docs-zeta/build-page-tree'
import { createUtils, loadContext } from 'next-docs-zeta/contentlayer'
import type { PageTree } from 'next-docs-zeta/server'

const ctx = loadContext(allMeta, allDocs)

const uiTree = buildPageTree(ctx, {
  root: 'docs/ui'
})

const headlessTree = buildPageTree(ctx, {
  root: 'docs/headless'
})

export function getTree(mode: 'ui' | 'headless' | string): PageTree {
  if (mode === 'ui') {
    return uiTree
  }

  return headlessTree
}

export const { getPage, getPageUrl } = createUtils(ctx)
