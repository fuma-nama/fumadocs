'use client';
import { usePathname } from 'fumadocs-core/framework';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import {
  createContext,
  type ReactNode,
  use,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type SetStateAction,
  type Dispatch,
} from 'react';

const SidebarContext = createContext<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  closeOnRedirect: RefObject<boolean>;
} | null>(null);

export function useSidebar() {
  const ctx = use(SidebarContext);
  if (!ctx)
    throw new Error(
      'the component must be wrapped under <SidebarProvider /> (fumadocs-ui/legacy/sidebar)',
    );
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeOnRedirect = useRef(true);
  const pathname = usePathname();

  useOnChange(pathname, () => {
    if (closeOnRedirect.current) {
      setOpen(false);
    } else {
      closeOnRedirect.current = true;
    }
  });

  return (
    <SidebarContext
      value={useMemo(
        () => ({
          closeOnRedirect,
          collapsed,
          open,
          setCollapsed,
          setOpen,
        }),
        [open, collapsed],
      )}
    >
      {children}
    </SidebarContext>
  );
}
