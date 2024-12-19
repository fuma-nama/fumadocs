'use client';
import { ChevronDown, ExternalLink, SidebarIcon } from 'lucide-react';
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
import { useSidebar } from '@/contexts/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { cva } from 'class-variance-authority';
import type {
  CollapsibleContentProps,
  CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible';
import type { PageTree } from 'fumadocs-core/server';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import type { SidebarComponents } from '@/layouts/docs/shared';

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
}

interface InternalContext {
  defaultOpenLevel: number;
  prefetch: boolean;
}

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md p-2 text-fd-muted-foreground [overflow-wrap:anywhere] md:py-1.5 [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 font-medium text-fd-primary',
        false:
          'transition-colors duration-100 hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
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
    <Sidebar
      {...props}
      onPointerEnter={collapsed ? onEnter : undefined}
      onPointerLeave={collapsed ? onLeave : undefined}
      data-collapsed={collapsed}
      className={cn(
        'md:transition-all',
        collapsed &&
          'md:-me-[var(--fd-sidebar-width)] md:translate-x-[calc(var(--fd-sidebar-offset)*-1)] rtl:md:translate-x-[var(--fd-sidebar-offset)]',
        collapsed && hover && 'z-50 md:translate-x-0',
        collapsed && !hover && 'md:opacity-0',
        props.className,
      )}
      style={
        {
          '--fd-sidebar-offset': 'calc(var(--fd-sidebar-width) - 20px)',
        } as object
      }
    />
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
          'fixed top-fd-layout-top z-30 bg-fd-card text-sm md:sticky md:h-[var(--fd-sidebar-height)]',
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
            'flex size-full max-w-full flex-col pt-2 md:ms-auto md:w-[var(--fd-sidebar-width)] md:border-e md:pt-4',
            inner?.className,
          )}
        >
          {props.children}
        </div>
      </Base.SidebarList>
    </Context.Provider>
  );
}

export function SidebarHeader(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('flex flex-col gap-2 px-4 empty:hidden', props.className)}
    >
      {props.children}
    </div>
  );
}

export function SidebarFooter(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col border-t px-4 py-3 empty:hidden',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function SidebarViewport(props: ScrollAreaProps) {
  return (
    <ScrollArea {...props} className={cn('h-full', props.className)}>
      <ScrollViewport
        className="px-4"
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
        'mb-2 mt-8 px-2 text-sm font-medium first:mt-0',
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
      className={cn(itemVariants({ active }), props.className)}
      prefetch={prefetch}
    >
      {icon ?? (props.external ? <ExternalLink /> : null)}
      {props.children}
    </Link>
  );
}

export function SidebarFolder({
  defaultOpen = false,
  ...props
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useOnChange(defaultOpen, (v) => {
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
      className={cn(itemVariants({ active: false }), 'w-full')}
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

  return (
    <Link
      {...props}
      data-active={active}
      className={cn(itemVariants({ active }), 'w-full', props.className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).hasAttribute('data-icon')) {
          setOpen((prev) => !prev);
          e.preventDefault();
        } else {
          setOpen((prev) => !active || !prev);
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
      <div className="ms-3 border-s py-1.5 ps-1.5 md:ms-2">
        {props.children}
      </div>
    </CollapsibleContent>
  );
}

export function SidebarCollapseTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      data-collapsed={collapsed}
      {...props}
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
        }),
        'backdrop-blur-lg',
        props.className,
      )}
      onClick={() => {
        setCollapsed((prev) => !prev);
      }}
    >
      {props.children ?? <SidebarIcon />}
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

/**
 * Render sidebar items from page tree
 */
export function SidebarPageTree(props: {
  components?: Partial<SidebarComponents>;
}) {
  const { root } = useTreeContext();

  return useMemo(() => {
    const { Separator, Item, Folder } = props.components ?? {};

    function renderSidebarList(
      items: PageTree.Node[],
      level: number,
    ): ReactNode[] {
      return items.map((item, i) => {
        const id = `${item.type}_${i.toString()}`;

        switch (item.type) {
          case 'separator':
            if (Separator) return <Separator key={id} item={item} />;
            return <SidebarSeparator key={id}>{item.name}</SidebarSeparator>;
          case 'folder':
            if (Folder) return <Folder key={id} item={item} level={level} />;
            return (
              <PageTreeFolder key={id} item={item} level={level}>
                {renderSidebarList(item.children, level + 1)}
              </PageTreeFolder>
            );
          default:
            if (Item) return <Item key={item.url} item={item} />;
            return (
              <SidebarItem
                key={item.url}
                href={item.url}
                external={item.external}
                icon={item.icon}
              >
                {item.name}
              </SidebarItem>
            );
        }
      });
    }

    return renderSidebarList(root.children, 1);
  }, [root, props.components]);
}

function PageTreeFolder({
  item,
  children,
  level,
}: {
  item: PageTree.Folder;
  level: number;
  children: ReactNode;
}) {
  const { defaultOpenLevel } = useInternalContext();
  const path = useTreePath();

  return (
    <SidebarFolder
      defaultOpen={
        (item.defaultOpen ?? defaultOpenLevel >= level) || path.includes(item)
      }
    >
      {item.index ? (
        <SidebarFolderLink href={item.index.url} external={item.index.external}>
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent>{children}</SidebarFolderContent>
    </SidebarFolder>
  );
}
