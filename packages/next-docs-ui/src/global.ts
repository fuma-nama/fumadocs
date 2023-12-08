import type { PageTree } from 'next-docs-zeta/server'

type Global = {
  [storeKey]?: PageTree
}

const storeKey = '__NEXT_DOCS_PAGE_TREE'

export function getPageTree(): PageTree | null {
  const global = globalThis as Global

  return global[storeKey] ?? null
}

export function setPageTree(tree: PageTree) {
  const global = globalThis as Global

  global[storeKey] = tree
}
