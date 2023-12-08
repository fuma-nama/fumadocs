import type { PageTree } from 'next-docs-zeta/server'
import { createContext, type ReactNode } from 'react'

type LayoutContextObject = {
  tree: PageTree
  sidebarDefaultOpenLevel?: number
}

export const LayoutContext = createContext<LayoutContextObject>({
  tree: { name: 'Docs', children: [] }
})

export function LayoutContextProvider({
  value,
  children
}: {
  value: LayoutContextObject
  children: ReactNode
}) {
  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  )
}
