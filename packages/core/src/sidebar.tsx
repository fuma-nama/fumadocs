import { usePathname } from 'next/navigation';
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type ElementType,
  type ReactNode,
  type ReactElement,
  type ComponentPropsWithoutRef,
} from 'react';
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

export function SidebarProvider(
  props: SidebarProviderProps,
): React.ReactElement {
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

type AsProps<T extends ElementType> = Omit<
  ComponentPropsWithoutRef<T>,
  'as'
> & {
  as?: T;
};

export type SidebarTriggerProps<T extends ElementType> = AsProps<T>;

export function SidebarTrigger<T extends ElementType = 'button'>({
  as,
  ...props
}: SidebarTriggerProps<T>): ReactElement {
  const [open, setOpen] = useSidebarContext();
  const As = as ?? 'button';

  return (
    <As
      aria-label="Toggle Sidebar"
      data-open={open}
      onClick={useCallback(() => {
        setOpen(!open);
      }, [open, setOpen])}
      {...props}
    />
  );
}

export type SidebarContentProps<T extends ElementType> = AsProps<T> & {
  /**
   * @deprecated Use `blockScrollingWidth` instead
   */
  minWidth?: number;

  /**
   * Disable scroll blocking when the viewport width is larger than a certain number (in pixels)
   */
  blockScrollingWidth?: number;
};

// todo: Change in next major
export function SidebarList<T extends ElementType = 'aside'>({
  as,
  minWidth,
  blockScrollingWidth = minWidth,
  ...props
}: SidebarContentProps<T>): ReactElement {
  const [open] = useSidebarContext();
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    if (!blockScrollingWidth) return;
    const mediaQueryList = window.matchMedia(
      `(min-width: ${blockScrollingWidth.toString()}px)`,
    );

    const handleChange = (): void => {
      setIsBlocking(!mediaQueryList.matches);
    };
    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [blockScrollingWidth]);

  return (
    <RemoveScroll
      as={as ?? 'aside'}
      data-open={open}
      enabled={isBlocking && open}
      {...props}
    >
      {props.children}
    </RemoveScroll>
  );
}
