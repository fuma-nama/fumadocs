import type { PageTree } from 'next-docs-zeta/server'
import { createContext } from 'react'

export const LayoutContext = createContext<{
  tree: PageTree
  sidebarDefaultOpenLevel?: number
}>({
  tree: { name: 'Docs', children: [] }
})
