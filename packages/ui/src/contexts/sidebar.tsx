import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { SidebarProvider as BaseProvider } from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';

interface SidebarContext {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;

  rootId?: string;
  setRootId: (root: string) => void;
}

const SidebarContext = createContext<SidebarContext | undefined>(undefined);

export function useSidebar(): SidebarContext {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('Missing root provider');
  return ctx;
}

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [rootId, setRootId] = useState<string>();

  useEffect(() => {
    setRootId(undefined);
  }, [pathname]);

  return (
    <SidebarContext.Provider
      value={useMemo(
        () => ({
          open,
          setOpen,
          collapsed,
          setCollapsed,
          rootId,
          setRootId,
        }),
        [open, collapsed, rootId],
      )}
    >
      <BaseProvider open={open} onOpenChange={setOpen}>
        {children}
      </BaseProvider>
    </SidebarContext.Provider>
  );
}
