'use client';
import {
  type ReactNode,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createContext, usePathname } from 'fumadocs-core/framework';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';

interface SidebarContext {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  /**
   * When set to false, don't close the sidebar when navigate to another page
   */
  closeOnRedirect: RefObject<boolean>;
}

const SidebarContext = createContext<SidebarContext>('SidebarContext');

export function useSidebar(): SidebarContext {
  return SidebarContext.use();
}

export function SidebarProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const closeOnRedirect = useRef(true);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pathname = usePathname();

  useOnChange(pathname, () => {
    if (closeOnRedirect.current) {
      setOpen(false);
    }
    closeOnRedirect.current = true;
  });

  return (
    <SidebarContext.Provider
      value={useMemo(
        () => ({
          open,
          setOpen,
          collapsed,
          setCollapsed,
          closeOnRedirect,
        }),
        [open, collapsed],
      )}
    >
      {children}
    </SidebarContext.Provider>
  );
}
