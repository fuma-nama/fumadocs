'use client';
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ElementType,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { RemoveScroll } from 'react-remove-scroll';
import { useMediaQuery } from './utils/use-media-query';

const SidebarContext = createContext<SidebarContextType | null>(null);

type SidebarContextType = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

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

export function SidebarProvider(props: SidebarProviderProps) {
  const [open, setOpen] =
    props.open === undefined
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useState(false)
      : [props.open, props.onOpenChange];

  return (
    <SidebarContext.Provider
      value={useMemo(
        () => ({ open, setOpen: setOpen ?? (() => undefined) }),
        [open, setOpen],
      )}
    >
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
  const { open, setOpen } = useSidebarContext();
  const As = as ?? 'button';

  return (
    <As
      aria-label="Toggle Sidebar"
      data-open={open}
      onClick={() => {
        setOpen(!open);
      }}
      {...props}
    />
  );
}

export type SidebarContentProps<T extends ElementType> = AsProps<T> & {
  /**
   * Disable scroll blocking when the viewport width is larger than a certain number (in pixels)
   *
   * @deprecated use `removeScrollOn`
   */
  blockScrollingWidth?: number;

  /**
   * A media query.
   *
   * When the sidebar is opening and media query is matched, scrolling outside the sidebar will be blocked.
   *
   * @example (max-width: 1000px)
   */
  removeScrollOn?: string;
};

export function SidebarList<T extends ElementType = 'aside'>({
  as,
  blockScrollingWidth,
  removeScrollOn = blockScrollingWidth
    ? `(width < ${blockScrollingWidth}px)`
    : undefined,
  ...props
}: SidebarContentProps<T>): ReactElement {
  const { open } = useSidebarContext();
  const isBlocking =
    useMediaQuery(removeScrollOn ?? '', !removeScrollOn) ?? false;

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
