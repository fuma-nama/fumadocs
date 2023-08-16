import { allDocs, allMeta } from 'contentlayer/generated'
import {
  buildPageTree,
  createUtils,
  loadContext
} from 'next-docs-zeta/contentlayer'
import type { TreeNode } from 'next-docs-zeta/server'
import { createElement } from 'react'

const ctx = loadContext(allMeta, allDocs, {
  resolveIcon(icon) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const res = require('lucide-react')
    icon = icon.trim()

    if (res[icon]) return createElement(res[icon])
    return undefined
  }
})

const uiTree = buildPageTree(ctx, {
  root: 'docs/ui'
})

const headlessTree = buildPageTree(ctx, {
  root: 'docs/headless'
})

export function getTree(mode: 'ui' | 'headless' | string): TreeNode[] {
  if (mode === 'ui') {
    return uiTree
  }

  return headlessTree
}

export const { getPage, getPageUrl } = createUtils(ctx)
