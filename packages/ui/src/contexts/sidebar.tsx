import { createContext, useContext, useState, useMemo } from 'react';
import { SidebarProvider as BaseProvider } from 'fumadocs-core/sidebar';

type SidebarCollapseContext = {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarCollapseContext | undefined>(
  undefined,
);

export function useSidebar(): SidebarCollapseContext {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('Missing root provider');
  return ctx;
}

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider
      value={useMemo(
        () => ({
          open,
          setOpen,
          collapsed,
          setCollapsed,
        }),
        [open, collapsed],
      )}
    >
      <BaseProvider open={open} onOpenChange={setOpen}>
        {children}
      </BaseProvider>
    </SidebarContext.Provider>
  );
}
