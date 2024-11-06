'use client';
import { ChevronDown, ExternalLink, SidebarIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  type ButtonHTMLAttributes,
  createContext,
  type HTMLAttributes,
  type PointerEventHandler,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { isActive } from '@/utils/shared';
import { LargeSearchToggle } from '@/components/layout/search-toggle';
import { useSearchContext } from '@/contexts/search';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type ScrollAreaProps } from '@radix-ui/react-scroll-area';
import { useSidebar } from '@/contexts/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { cva } from 'class-variance-authority';
import type {
  CollapsibleContentProps,
  CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible';

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
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

  /**
   * @defaultValue true
   */
  collapsible?: boolean;
}

interface InternalContext {
  defaultOpenLevel: number;
  prefetch: boolean;
}

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md px-3 py-2.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] md:px-2 md:py-1.5 [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 font-medium text-fd-primary',
        false:
          'hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
      },
    },
  },
);

const Context = createContext<InternalContext | undefined>(undefined);
const FolderContext = createContext<
  | {
      open: boolean;
      setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }
  | undefined
>(undefined);

export function CollapsibleSidebar(props: SidebarProps) {
  const { collapsed } = useSidebar();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const closeTimeRef = useRef(0);

  useOnChange(collapsed, () => {
    setHover(false);
    closeTimeRef.current = Date.now() + 150;
  });

  const onEnter: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch' || closeTimeRef.current > Date.now()) return;
    window.clearTimeout(timerRef.current);
    setHover(true);
  }, []);

  const onLeave: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(
      () => {
        setHover(false);
        closeTimeRef.current = Date.now() + 150;
      },
      Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100
        ? 0
        : 500,
    );
  }, []);

  return (
    <>
      <SidebarCollapseTrigger
        className={cn(
          'fixed bottom-3 start-2 z-20 transition-opacity max-md:hidden',
          (!collapsed || hover) && 'opacity-0',
        )}
      />
      <Sidebar
        {...props}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        className={cn(
          'transition-[margin,transform,opacity]',
          collapsed &&
            'md:-me-[var(--fd-sidebar-offset)] md:w-fit md:flex-initial md:translate-x-[calc(var(--fd-sidebar-offset)*-1)] rtl:md:translate-x-[var(--fd-sidebar-offset)]',
          collapsed && hover && 'md:translate-x-0',
          collapsed && !hover && 'md:z-10 md:opacity-0',
          props.className,
        )}
        style={
          {
            '--fd-sidebar-offset': 'calc(var(--fd-sidebar-width) - 30px)',
          } as object
        }
      />
    </>
  );
}

export function Sidebar({
  defaultOpenLevel = 0,
  prefetch = true,
  inner,
  ...props
}: SidebarProps & { inner?: HTMLAttributes<HTMLDivElement> }) {
  const context = useMemo<InternalContext>(() => {
    return {
      defaultOpenLevel,
      prefetch,
    };
  }, [defaultOpenLevel, prefetch]);

  return (
    <Context.Provider value={context}>
      <Base.SidebarList
        id="nd-sidebar"
        blockScrollingWidth={768} // md
        {...props}
        className={cn(
          'fixed top-fd-layout-top z-30 bg-fd-card text-sm md:sticky md:h-[var(--fd-sidebar-height)] md:flex-1',
          'max-md:inset-x-0 max-md:bottom-0 max-md:bg-fd-background/80 max-md:text-[15px] max-md:backdrop-blur-lg max-md:data-[open=false]:invisible',
          props.className,
        )}
        style={
          {
            ...props.style,
            '--fd-sidebar-height':
              'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
          } as object
        }
      >
        <div
          {...inner}
          className={cn(
            'flex size-full flex-col pt-2 md:ms-auto md:w-[var(--fd-sidebar-width)] md:border-e md:pt-4',
            inner?.className,
          )}
        >
          {props.children}
        </div>
      </Base.SidebarList>
    </Context.Provider>
  );
}

export function SidebarSearchToggle(): ReactNode {
  const search = useSearchContext();
  if (!search.enabled) return null;

  return <LargeSearchToggle className="rounded-lg max-md:hidden" />;
}

export function SidebarHeader(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col gap-2 px-4 empty:hidden md:px-3',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function SidebarFooter(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('flex flex-col border-t p-3 empty:hidden', props.className)}
    >
      {props.children}
    </div>
  );
}

export function SidebarViewport(props: ScrollAreaProps) {
  return (
    <ScrollArea {...props} className={cn('h-full', props.className)}>
      <ScrollViewport
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 2px, white 16px)',
        }}
      >
        {props.children}
      </ScrollViewport>
    </ScrollArea>
  );
}

export function SidebarSeparator(props: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cn(
        'mb-2 mt-8 px-3 text-sm font-medium first:mt-0 md:px-2',
        props.className,
      )}
    >
      {props.children}
    </p>
  );
}

export function SidebarItem({
  icon,
  ...props
}: LinkProps & {
  icon?: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);
  const { prefetch } = useInternalContext();

  return (
    <Link
      {...props}
      data-active={active}
      className={cn(itemVariants({ active }))}
      prefetch={prefetch}
    >
      {icon ?? (props.external ? <ExternalLink /> : null)}
      {props.children}
    </Link>
  );
}

export function SidebarFolder({
  item,
  level,
  defaultOpen,
  ...props
}: {
  item?: PageTree.Folder;
  children: ReactNode;
  defaultOpen?: boolean;
  level: number;
}) {
  const { defaultOpenLevel } = useInternalContext();
  const { path } = useTreeContext();

  const shouldExtend =
    (item && path.includes(item)) || (defaultOpen ?? defaultOpenLevel >= level);
  const [open, setOpen] = useState(shouldExtend);

  useOnChange(shouldExtend, (v) => {
    if (v) setOpen(v);
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <FolderContext.Provider
        value={useMemo(() => ({ open, setOpen }), [open])}
      >
        {props.children}
      </FolderContext.Provider>
    </Collapsible>
  );
}

export function SidebarFolderTrigger(props: CollapsibleTriggerProps) {
  const { open } = useFolderContext();

  return (
    <CollapsibleTrigger
      {...props}
      className={cn(itemVariants({ active: false }), 'w-full md:pe-1.5')}
    >
      {props.children}
      <ChevronDown
        data-icon
        className={cn('ms-auto transition-transform', !open && '-rotate-90')}
      />
    </CollapsibleTrigger>
  );
}

export function SidebarFolderLink(props: LinkProps) {
  const { open, setOpen } = useFolderContext();
  const { prefetch } = useInternalContext();

  const pathname = usePathname();
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);

  useLayoutEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active, setOpen]);

  return (
    <Link
      {...props}
      data-active={active}
      className={cn(
        itemVariants({ active }),
        'w-full md:pe-1.5',
        props.className,
      )}
      onClick={(e) => {
        if (
          // clicking on icon
          (e.target as HTMLElement).hasAttribute('data-icon') ||
          active
        ) {
          setOpen((prev) => !prev);
          e.preventDefault();
        }
      }}
      prefetch={prefetch}
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
  return (
    <CollapsibleContent {...props}>
      <div className="ms-2 border-s py-1.5 ps-2">{props.children}</div>
    </CollapsibleContent>
  );
}

export function SidebarCollapseTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      {...props}
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
        }),
        props.className,
      )}
      onClick={() => {
        setCollapsed((prev) => !prev);
      }}
    >
      <SidebarIcon />
    </button>
  );
}

function useFolderContext() {
  const ctx = useContext(FolderContext);

  if (!ctx) throw new Error('Missing sidebar folder');
  return ctx;
}

function useInternalContext(): InternalContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('<Sidebar /> component required.');

  return ctx;
}
