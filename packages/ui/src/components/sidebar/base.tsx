'use client';
import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
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
import { cn } from '@/utils/cn';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { isActive } from '@/utils/is-active';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type ScrollAreaProps } from '@radix-ui/react-scroll-area';
import type {
  CollapsibleContentProps,
  CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible';
import { useMediaQuery } from 'fumadocs-core/utils/use-media-query';
import { Presence } from '@radix-ui/react-presence';
import scrollIntoView from 'scroll-into-view-if-needed';
import { usePathname } from 'fumadocs-core/framework';

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
  prefetch: boolean;
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
   * Prefetch links
   *
   * @defaultValue true
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
} | null>(null);

export function SidebarProvider({
  defaultOpenLevel = 0,
  prefetch = true,
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

export function useFolderDepth() {
  return use(FolderContext)?.depth ?? 0;
}

export function SidebarContent({
  children,
  aside,
}: {
  aside?: (state: {
    collapsed: boolean;
    hovered: boolean;
  }) => ComponentProps<'aside'>;
  children: ReactNode;
}) {
  const { collapsed, mode } = useSidebar();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const ignoreHoverUntil = useRef(0);

  useOnChange(collapsed, () => {
    if (collapsed) {
      setHover(true);
      ignoreHoverUntil.current = Date.now() + 200;

      setTimeout(() => {
        setHover(false);
      }, 200);
    }
  });

  if (mode !== 'full') return;

  return (
    <aside
      id="nd-sidebar"
      data-collapsed={collapsed}
      data-hovered={collapsed && hover}
      {...aside?.({ collapsed, hovered: hover })}
      onPointerEnter={(e) => {
        if (
          !collapsed ||
          e.pointerType === 'touch' ||
          ignoreHoverUntil.current > Date.now()
        )
          return;
        window.clearTimeout(timerRef.current);
        setHover(true);
      }}
      onPointerLeave={(e) => {
        if (
          !collapsed ||
          e.pointerType === 'touch' ||
          ignoreHoverUntil.current > Date.now()
        )
          return;
        window.clearTimeout(timerRef.current);

        timerRef.current = window.setTimeout(
          () => {
            setHover(false);
            ignoreHoverUntil.current = Date.now() + 200;
          },
          Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100
            ? 0
            : 500,
        );
      }}
    >
      {children}
    </aside>
  );
}

export function SidebarDrawerOverlay(props: ComponentProps<'div'>) {
  const { open, setOpen, mode } = useSidebar();

  if (mode !== 'drawer') return;
  return (
    <Presence present={open}>
      <div
        data-state={open ? 'open' : 'closed'}
        onClick={() => setOpen(false)}
        {...props}
      />
    </Presence>
  );
}

export function SidebarDrawerContent({
  className,
  children,
  ...props
}: ComponentProps<'aside'>) {
  const { open, mode } = useSidebar();
  const state = open ? 'open' : 'closed';

  if (mode !== 'drawer') return;
  return (
    <Presence present={open}>
      {({ present }) => (
        <aside
          id="nd-sidebar-mobile"
          data-state={state}
          className={cn(!present && 'invisible', className)}
          {...props}
        >
          {children}
        </aside>
      )}
    </Presence>
  );
}

export function SidebarViewport(props: ScrollAreaProps) {
  return (
    <ScrollArea {...props} className={cn('min-h-0 flex-1', props.className)}>
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
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);

  useAutoScroll(active, ref);

  return (
    <Link ref={ref} data-active={active} prefetch={prefetch} {...props}>
      {icon ?? (props.external ? <ExternalLink /> : null)}
      {children}
    </Link>
  );
}

export function SidebarFolder({
  defaultOpen: defaultOpenOption = false,
  ...props
}: ComponentProps<'div'> & {
  defaultOpen?: boolean | ((currentDefault: boolean) => boolean);
}) {
  const { defaultOpenLevel } = useSidebar();
  const depth = useFolderDepth() + 1;
  const defaultOpen =
    typeof defaultOpenOption === 'function'
      ? defaultOpenOption(defaultOpenLevel >= depth)
      : defaultOpenLevel >= depth || defaultOpenOption;
  const [open, setOpen] = useState(defaultOpen);

  useOnChange(defaultOpen, (v) => {
    if (v) setOpen(v);
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} {...props}>
      <FolderContext
        value={useMemo(() => ({ open, setOpen, depth }), [depth, open])}
      >
        {props.children}
      </FolderContext>
    </Collapsible>
  );
}

export function SidebarFolderTrigger(props: CollapsibleTriggerProps) {
  const { open } = use(FolderContext)!;

  return (
    <CollapsibleTrigger {...props}>
      {props.children}
      <ChevronDown
        data-icon
        className={cn('ms-auto transition-transform', !open && '-rotate-90')}
      />
    </CollapsibleTrigger>
  );
}

export function SidebarFolderLink(props: LinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { open, setOpen } = use(FolderContext)!;
  const { prefetch } = useSidebar();
  const pathname = usePathname();
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);

  useAutoScroll(active, ref);

  return (
    <Link
      ref={ref}
      data-active={active}
      onClick={(e) => {
        if (
          e.target instanceof Element &&
          e.target.matches('[data-icon], [data-icon] *')
        ) {
          setOpen(!open);
          e.preventDefault();
        } else {
          setOpen(active ? !open : true);
        }
      }}
      prefetch={prefetch}
      {...props}
    >
      {props.children}
      <ChevronDown
        data-icon
        className={cn('ms-auto transition-transform', !open && '-rotate-90')}
      />
    </Link>
  );
}

export function SidebarFolderContent(props: CollapsibleContentProps) {
  return <CollapsibleContent {...props}>{props.children}</CollapsibleContent>;
}

export function SidebarTrigger({
  children,
  ...props
}: ComponentProps<'button'>) {
  const { setOpen } = useSidebar();

  return (
    <button
      aria-label="Open Sidebar"
      onClick={() => setOpen((prev) => !prev)}
      {...props}
    >
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

function useAutoScroll(
  active: boolean,
  ref: RefObject<HTMLAnchorElement | null>,
) {
  const { mode } = useSidebar();

  useEffect(() => {
    if (active && ref.current) {
      scrollIntoView(ref.current, {
        boundary: document.getElementById(
          mode === 'drawer' ? 'nd-sidebar-mobile' : 'nd-sidebar',
        ),
        scrollMode: 'if-needed',
      });
    }
  }, [active, mode, ref]);
}
