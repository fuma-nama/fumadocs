import type { TreeNode } from 'next-docs-zeta/server'
import { createContext } from 'react'

export const PagesContext = createContext<{
  tree: TreeNode[]
}>({
  tree: []
})
