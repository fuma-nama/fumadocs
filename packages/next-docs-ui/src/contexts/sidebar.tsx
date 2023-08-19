import { createContext, useState, type ReactNode } from 'react'

export const SidebarContext = createContext<
  [open: boolean, setOpen: (v: boolean) => void]
>([true, () => {}])

export function DesktopSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <SidebarContext.Provider value={[open, setOpen]}>
      {children}
    </SidebarContext.Provider>
  )
}
