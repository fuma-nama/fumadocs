import type { PageTree } from 'next-docs-zeta/server'
import { createContext } from 'react'

export const PagesContext = createContext<{
  tree: PageTree
}>({
  tree: { name: 'Docs', children: [] }
})
