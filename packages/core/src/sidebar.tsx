import { usePathname } from 'next/navigation';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { RemoveScroll } from 'react-remove-scroll';

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

type SidebarContextType = [open: boolean, setOpen: (value: boolean) => void];

export interface SidebarProviderProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: ReactNode;
}

function useSidebarContext(): SidebarContextType {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('Missing sidebar provider');
  return ctx;
}

export function SidebarProvider(props: SidebarProviderProps): JSX.Element {
  const [openInner, setOpenInner] = useState(false);
  const [open, setOpen] = [
    props.open ?? openInner,
    props.onOpenChange ?? setOpenInner,
  ];

  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider value={[open, setOpen]}>
      {props.children}
    </SidebarContext.Provider>
  );
}

type WithAs<T extends ElementType, Extend = object> = Omit<
  ComponentPropsWithoutRef<T>,
  'as' | keyof Extend
> &
  Extend & {
    as?: T;
  };

export type SidebarTriggerProps<T extends ElementType> = WithAs<T>;

export function SidebarTrigger<T extends ElementType = 'button'>({
  as,
  ...props
}: SidebarTriggerProps<T>): JSX.Element {
  const [open, setOpen] = useSidebarContext();
  const As = as ?? 'button';

  return (
    <As
      data-open={open}
      onClick={() => {
        setOpen(!open);
      }}
      {...props}
    />
  );
}

export type SidebarContentProps<T extends ElementType> = WithAs<
  T,
  {
    minWidth?: number;
  }
>;

export function SidebarList<T extends ElementType = 'aside'>({
  as,
  minWidth,
  ...props
}: SidebarContentProps<T>): JSX.Element {
  const [open] = useSidebarContext();
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    if (minWidth === undefined) return;
    const mediaQueryList = window.matchMedia(`(min-width: ${minWidth}px)`);

    const handleChange = (): void => {
      setIsMobileLayout(!mediaQueryList.matches);
    };
    handleChange();

    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [minWidth]);

  return (
    <RemoveScroll
      as={as ?? 'aside'}
      data-open={isMobileLayout ? open : false}
      enabled={isMobileLayout ? open : false}
      {...props}
    >
      {props.children}
    </RemoveScroll>
  );
}
