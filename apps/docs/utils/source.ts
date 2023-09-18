import { allDocs, allMeta } from 'contentlayer/generated'
import { AxeIcon } from 'lucide-react'
import {
  buildPageTree,
  createUtils,
  loadContext
} from 'next-docs-zeta/contentlayer'
import type { PageTree } from 'next-docs-zeta/server'
import { createElement } from 'react'

const ctx = loadContext(allMeta, allDocs, {
  resolveIcon() {
    return createElement(AxeIcon)
  }
})

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
