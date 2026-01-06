'use client';
import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@fumadocs/ui/cn';
import { ScrollArea, type ScrollAreaProps, ScrollViewport } from '@/components/ui/scroll-area';
import { isActive } from '@fumadocs/ui/urls';
import {
  Collapsible,
  CollapsibleContent,
  type CollapsibleContentProps,
  CollapsibleTrigger,
  type CollapsibleTriggerProps,
} from '@/components/ui/collapsible';
import { useMediaQuery } from 'fumadocs-core/utils/use-media-query';
import scrollIntoView from 'scroll-into-view-if-needed';
import { usePathname } from 'fumadocs-core/framework';
import ReactDOM from 'react-dom';

interface SidebarContext {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  /**
   * When set to false, don't close the sidebar when navigate to another page
   */
  closeOnRedirect: RefObject<boolean>;
  defaultOpenLevel: number;
  prefetch?: boolean;
  mode: Mode;
}

export interface SidebarProviderProps {
  /**
   * Open folders by default if their level is lower or equal to a specific level
   * (Starting from 1)
   *
   * @defaultValue 0
   */
  defaultOpenLevel?: number;

  /**
   * Prefetch links, default behaviour depends on your React.js framework.
   */
  prefetch?: boolean;

  children?: ReactNode;
}

type Mode = 'drawer' | 'full';

const SidebarContext = createContext<SidebarContext | null>(null);

const FolderContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  depth: number;
  collapsible: boolean;
} | null>(null);

export function SidebarProvider({
  defaultOpenLevel = 0,
  prefetch,
  children,
}: SidebarProviderProps) {
  const closeOnRedirect = useRef(true);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const mode: Mode = useMediaQuery('(width < 768px)') ? 'drawer' : 'full';

  useOnChange(pathname, () => {
    if (closeOnRedirect.current) {
      setOpen(false);
    }
    closeOnRedirect.current = true;
  });

  return (
    <SidebarContext
      value={useMemo(
        () => ({
          open,
          setOpen,
          collapsed,
          setCollapsed,
          closeOnRedirect,
          defaultOpenLevel,
          prefetch,
          mode,
        }),
        [open, collapsed, defaultOpenLevel, prefetch, mode],
      )}
    >
      {children}
    </SidebarContext>
  );
}

export function useSidebar(): SidebarContext {
  const ctx = use(SidebarContext);
  if (!ctx)
    throw new Error(
      'Missing SidebarContext, make sure you have wrapped the component in <DocsLayout /> and the context is available.',
    );

  return ctx;
}

export function useFolder() {
  return use(FolderContext);
}

export function useFolderDepth() {
  return use(FolderContext)?.depth ?? 0;
}

export function SidebarContent({
  children,
}: {
  children: (state: {
    ref: RefObject<HTMLElement | null>;
    collapsed: boolean;
    hovered: boolean;
    onPointerEnter: (event: PointerEvent) => void;
    onPointerLeave: (event: PointerEvent) => void;
  }) => ReactNode;
}) {
  const { collapsed, mode } = useSidebar();
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const timerRef = useRef(0);

  useOnChange(collapsed, () => {
    if (collapsed) setHover(false);
  });

  if (mode !== 'full') return;

  function shouldIgnoreHover(e: PointerEvent): boolean {
    const element = ref.current;
    if (!element) return true;

    return !collapsed || e.pointerType === 'touch' || element.getAnimations().length > 0;
  }

  return children({
    ref,
    collapsed,
    hovered: hover,
    onPointerEnter(e) {
      if (shouldIgnoreHover(e)) return;
      window.clearTimeout(timerRef.current);
      setHover(true);
    },
    onPointerLeave(e) {
      if (shouldIgnoreHover(e)) return;
      window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(
        () => setHover(false),
        // if mouse is leaving the viewport, add a close delay
        Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100 ? 0 : 500,
      );
    },
  });
}

export function SidebarDrawerOverlay(props: ComponentProps<'div'>) {
  const { open, setOpen, mode } = useSidebar();
  const [hidden, setHidden] = useState(!open);

  if (open && hidden) setHidden(false);
  if (mode !== 'drawer' || hidden) return;
  return (
    <div
      data-state={open ? 'open' : 'closed'}
      onClick={() => setOpen(false)}
      onAnimationEnd={() => {
        if (!open) ReactDOM.flushSync(() => setHidden(true));
      }}
      {...props}
    />
  );
}

export function SidebarDrawerContent({ className, children, ...props }: ComponentProps<'aside'>) {
  const { open, mode } = useSidebar();
  const [hidden, setHidden] = useState(!open);

  if (open && hidden) setHidden(false);
  if (mode !== 'drawer') return;
  return (
    <aside
      id="nd-sidebar-mobile"
      data-state={open ? 'open' : 'closed'}
      className={cn(hidden && 'invisible', className)}
      onAnimationEnd={() => {
        if (!open) ReactDOM.flushSync(() => setHidden(true));
      }}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarViewport({ className, ...props }: ScrollAreaProps) {
  return (
    <ScrollArea
      className={(s) =>
        cn('min-h-0 flex-1', typeof className === 'function' ? className(s) : className)
      }
      {...props}
    >
      <ScrollViewport
        className="p-4 overscroll-contain"
        style={
          {
            maskImage:
              'linear-gradient(to bottom, transparent, white 12px, white calc(100% - 12px), transparent)',
          } as object
        }
      >
        {props.children}
      </ScrollViewport>
    </ScrollArea>
  );
}

export function SidebarSeparator(props: ComponentProps<'p'>) {
  const depth = useFolderDepth();
  return (
    <p
      {...props}
      className={cn(
        'inline-flex items-center gap-2 mb-1.5 px-2 mt-6 empty:mb-0',
        depth === 0 && 'first:mt-0',
        props.className,
      )}
    >
      {props.children}
    </p>
  );
}

export function SidebarItem({
  icon,
  children,
  ...props
}: LinkProps & {
  icon?: ReactNode;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLAnchorElement>(null);
  const { prefetch } = useSidebar();
  const active = props.href !== undefined && isActive(props.href, pathname, false);

  useAutoScroll(active, ref);

  return (
    <Link ref={ref} data-active={active} prefetch={prefetch} {...props}>
      {icon ?? (props.external ? <ExternalLink /> : null)}
      {children}
    </Link>
  );
}

export function SidebarFolder({
  defaultOpen: defaultOpenProp,
  collapsible = true,
  active = false,
  children,
  ...props
}: ComponentProps<'div'> & {
  active?: boolean;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const { defaultOpenLevel } = useSidebar();
  const depth = useFolderDepth() + 1;
  const defaultOpen =
    collapsible === false || active || (defaultOpenProp ?? defaultOpenLevel >= depth);
  const [open, setOpen] = useState(defaultOpen);

  useOnChange(defaultOpen, (v) => {
    if (v) setOpen(v);
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} disabled={!collapsible} {...props}>
      <FolderContext
        value={useMemo(() => ({ open, setOpen, depth, collapsible }), [collapsible, depth, open])}
      >
        {children}
      </FolderContext>
    </Collapsible>
  );
}

export function SidebarFolderTrigger({ children, ...props }: CollapsibleTriggerProps) {
  const { open, collapsible } = use(FolderContext)!;

  if (collapsible) {
    return (
      <CollapsibleTrigger {...props}>
        {children}
        <ChevronDown
          data-icon
          className={cn('ms-auto transition-transform', !open && '-rotate-90')}
        />
      </CollapsibleTrigger>
    );
  }

  return <div {...(props as ComponentProps<'div'>)}>{children}</div>;
}

export function SidebarFolderLink({ children, ...props }: LinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { open, setOpen, collapsible } = use(FolderContext)!;
  const { prefetch } = useSidebar();
  const pathname = usePathname();
  const active = props.href !== undefined && isActive(props.href, pathname, false);

  useAutoScroll(active, ref);

  return (
    <Link
      ref={ref}
      data-active={active}
      onClick={(e) => {
        if (!collapsible) return;

        if (e.target instanceof Element && e.target.matches('[data-icon], [data-icon] *')) {
          setOpen(!open);
          e.preventDefault();
        } else {
          setOpen(active ? !open : true);
        }
      }}
      prefetch={prefetch}
      {...props}
    >
      {children}
      {collapsible && (
        <ChevronDown
          data-icon
          className={cn('ms-auto transition-transform', !open && '-rotate-90')}
        />
      )}
    </Link>
  );
}

export function SidebarFolderContent(props: CollapsibleContentProps) {
  return <CollapsibleContent {...props}>{props.children}</CollapsibleContent>;
}

export function SidebarTrigger({ children, ...props }: ComponentProps<'button'>) {
  const { setOpen } = useSidebar();

  return (
    <button aria-label="Open Sidebar" onClick={() => setOpen((prev) => !prev)} {...props}>
      {children}
    </button>
  );
}

export function SidebarCollapseTrigger(props: ComponentProps<'button'>) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      data-collapsed={collapsed}
      onClick={() => {
        setCollapsed((prev) => !prev);
      }}
      {...props}
    >
      {props.children}
    </button>
  );
}

/**
 * scroll to the element if `active` is true
 */
export function useAutoScroll(active: boolean, ref: RefObject<HTMLElement | null>) {
  const { mode } = useSidebar();

  useEffect(() => {
    if (active && ref.current) {
      scrollIntoView(ref.current, {
        boundary: document.getElementById(mode === 'drawer' ? 'nd-sidebar-mobile' : 'nd-sidebar'),
        scrollMode: 'if-needed',
      });
    }
  }, [active, mode, ref]);
}
