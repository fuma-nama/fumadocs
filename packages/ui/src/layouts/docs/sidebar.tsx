'use client';
import { ChevronDown, ExternalLink, SidebarIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  type ButtonHTMLAttributes,
  createContext,
  type FC,
  type HTMLAttributes,
  memo,
  type PointerEventHandler,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'fumadocs-core/link';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { isActive } from '@/utils/shared';
import { LargeSearchToggle } from '@/components/layout/search-toggle';
import { useSearchContext } from '@/contexts/search';
import { itemVariants } from '@/components/layout/variants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type ScrollAreaProps } from '@radix-ui/react-scroll-area';
import { useSidebar } from '@/contexts/sidebar';
import { buttonVariants } from '@/components/ui/button';

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
   * Customise each of the component
   */
  components?: Partial<Components>;

  /**
   * @defaultValue true
   */
  collapsible?: boolean;
}

interface InternalContext {
  defaultOpenLevel: number;
  components: Components;
  prefetch: boolean;
}

interface Components {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

const Context = createContext<InternalContext | undefined>(undefined);

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
      data-fd-collapsed={collapsed && !hover}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        'group transition-all',
        collapsed &&
          'md:-me-[var(--fd-sidebar-offset)] md:w-fit md:flex-initial md:translate-x-[calc(var(--fd-sidebar-offset)*-1)] rtl:md:translate-x-[var(--fd-sidebar-offset)]',
        collapsed && hover && 'md:translate-x-0',
        props.className,
      )}
    />
  );
}

export function Sidebar({
  components,
  defaultOpenLevel = 0,
  prefetch = true,
  inner,
  ...props
}: SidebarProps & { inner?: HTMLAttributes<HTMLDivElement> }) {
  const context = useMemo<InternalContext>(
    () => ({
      defaultOpenLevel,
      components: {
        Folder: SidebarFolder,
        Separator: SidebarSeparator,
        Item: SidebarItem,
        ...components,
      },
      prefetch,
    }),
    [components, defaultOpenLevel, prefetch],
  );

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
            '--fd-sidebar-offset': 'calc(var(--fd-sidebar-width) - 46px)',
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
        'flex flex-col gap-2 px-4 transition-opacity empty:hidden group-data-[fd-collapsed=true]:opacity-0 md:px-3',
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
      className={cn(
        'flex flex-col border-t p-3 empty:hidden group-data-[fd-collapsed=true]:pe-1.5',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function SidebarViewport(props: ScrollAreaProps) {
  return (
    <ScrollArea
      {...props}
      className={cn(
        'h-full transition-opacity group-data-[fd-collapsed=true]:opacity-0',
        props.className,
      )}
    >
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

export function SidebarList() {
  const { root } = useTreeContext();
  const { components } = useInternalContext();

  return (
    <div className="px-2 py-4 md:px-3">
      {renderList(root.children, 0, components)}
    </div>
  );
}

export const SidebarSeparator = memo(
  ({ item }: { item: PageTree.Separator }) => {
    return (
      <p className="mb-2 mt-8 px-2 text-sm font-medium first:mt-0">
        {item.name}
      </p>
    );
  },
);

SidebarSeparator.displayName = 'SidebarSeparator';

function renderList(
  items: PageTree.Node[],
  level: number,
  { Separator, Item, Folder }: Components,
): ReactNode[] {
  return items.map((item, i) => {
    const id = `${item.type}_${i.toString()}`;

    switch (item.type) {
      case 'separator':
        return <Separator key={id} item={item} />;
      case 'folder':
        return <Folder key={id} item={item} level={level + 1} />;
      default:
        return <Item key={item.url} item={item} />;
    }
  });
}

export const SidebarItem = memo(({ item }: { item: PageTree.Item }) => {
  const pathname = usePathname();
  const active = isActive(item.url, pathname, false);
  const { prefetch } = useInternalContext();

  return (
    <Link
      href={item.url}
      external={item.external}
      data-active={active}
      className={cn(itemVariants())}
      prefetch={prefetch}
    >
      {item.icon ?? (item.external ? <ExternalLink /> : null)}
      {item.name}
    </Link>
  );
});

SidebarItem.displayName = 'SidebarItem';

export const SidebarFolder = memo(
  ({ item, level }: { item: PageTree.Folder; level: number }) => {
    const { defaultOpenLevel, prefetch, components } = useInternalContext();
    const { path } = useTreeContext();
    const pathname = usePathname();
    const active =
      item.index !== undefined && isActive(item.index.url, pathname, false);
    const className = cn(itemVariants(), 'w-full md:pe-1.5');

    const shouldExtend =
      active ||
      path.includes(item) ||
      (item.defaultOpen ?? defaultOpenLevel >= level);
    const [open, setOpen] = useState(shouldExtend);

    useOnChange(shouldExtend, (v) => {
      if (v) setOpen(v);
    });

    const content = (
      <>
        {item.icon}
        {item.name}
        <ChevronDown
          data-icon
          className={cn('ms-auto transition-transform', !open && '-rotate-90')}
        />
      </>
    );

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        {item.index ? (
          <Link
            data-active={active}
            className={className}
            href={item.index.url}
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
            {content}
          </Link>
        ) : (
          <CollapsibleTrigger data-active={active} className={className}>
            {content}
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <div className="ms-2 border-s py-1.5 ps-2">
            {renderList(item.children, level, components)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
);

SidebarFolder.displayName = 'SidebarFolder';

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

function useInternalContext(): InternalContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('<Sidebar /> component required.');

  return ctx;
}
