import { createContext, useContext, useState, type ReactNode } from 'react';

type SidebarCollapseContext = [open: boolean, setOpen: (v: boolean) => void];

const SidebarCollapseContext = createContext<
  SidebarCollapseContext | undefined
>(undefined);

export function useSidebarCollapse(): SidebarCollapseContext {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) throw new Error('Missing root provider');
  return ctx;
}

export function SidebarCollapseProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <SidebarCollapseContext.Provider value={[open, setOpen]}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}
