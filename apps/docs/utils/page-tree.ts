import { allDocs, allMeta } from 'contentlayer/generated'
import { buildPageTree, loadContext } from 'next-docs-zeta/contentlayer'
import type { TreeNode } from 'next-docs-zeta/server'
import { createElement } from 'react'

const ctx = loadContext(allMeta, allDocs)

ctx.resolveIcon = icon => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const res = require('lucide-react')

  if (res[icon]) return createElement(res[icon])
  return undefined
}

export const uiTree = buildPageTree(ctx, {
  root: 'docs/ui'
})
export const headlessTree = buildPageTree(ctx, {
  root: 'docs/headless'
})

export function getTree(mode: 'ui' | 'headless' | string): TreeNode[] {
  if (mode === 'ui') {
    return uiTree
  }

  return headlessTree
}
