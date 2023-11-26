import { createContext, useContext, useState, type ReactNode } from 'react'

type SidebarCollapseContext = [open: boolean, setOpen: (v: boolean) => void]

const SidebarCollapseContext = createContext<SidebarCollapseContext>([
  true,
  () => {}
])

export function useSidebarCollapse(): SidebarCollapseContext {
  return useContext(SidebarCollapseContext)
}

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <SidebarCollapseContext.Provider value={[open, setOpen]}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}
