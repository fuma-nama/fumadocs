'use client';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type FC,
  type HTMLAttributes,
  memo,
  type ReactNode,
  useContext,
  useMemo,
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
} from '../ui/collapsible';
import { type Option } from '@/components/layout/root-toggle';
import dynamic from 'next/dynamic';

const RootToggle = dynamic(() =>
  import('@/components/layout/root-toggle').then((mod) => mod.RootToggle),
);

export interface SidebarProps {
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

  tabs?: Option[];

  banner?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;

  /**
   * Hide search trigger
   *
   * @defaultValue false
   */
  hideSearch?: boolean;
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

export const Sidebar = memo(
  ({
    components,
    defaultOpenLevel = 0,
    prefetch = true,
    tabs = [],
    ...props
  }: SidebarProps & {
    aside?: HTMLAttributes<HTMLElement> & Record<string, unknown>;
  }) => {
    const search = useSearchContext();
    const hasSearch = search.enabled && !props.hideSearch;
    const context = useMemo<InternalContext>(
      () => ({
        defaultOpenLevel,
        components: {
          Folder: FolderNode,
          Separator: SeparatorNode,
          Item: PageNode,
          ...components,
        },
        prefetch,
      }),
      [components, defaultOpenLevel, prefetch],
    );

    return (
      <Base.SidebarList
        id="nd-sidebar"
        blockScrollingWidth={768} // md
        {...props.aside}
        className={cn(
          'fixed top-fd-layout-top z-30 bg-fd-card text-sm md:sticky md:h-[var(--fd-sidebar-height)] md:flex-1',
          'max-md:inset-x-0 max-md:bottom-0 max-md:bg-fd-background/80 max-md:text-[15px] max-md:backdrop-blur-lg max-md:data-[open=false]:invisible',
          props.aside?.className,
        )}
        style={
          {
            ...props.aside?.style,
            '--fd-sidebar-height':
              'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
          } as object
        }
      >
        <div className="flex size-full flex-col pt-2 md:ms-auto md:w-[var(--fd-sidebar-width)] md:max-w-full md:border-e md:pt-4">
          <div className="flex flex-col gap-2 px-4 empty:hidden md:px-3 md:pb-2">
            {props.banner}
            {tabs.length > 0 ? (
              <RootToggle options={tabs} className="-mx-2" />
            ) : null}
          </div>
          {hasSearch ? (
            <LargeSearchToggle className="mx-4 rounded-lg max-md:hidden md:mx-3" />
          ) : null}
          <ScrollArea className="h-full">
            <ScrollViewport
              style={{
                maskImage:
                  'linear-gradient(to bottom, transparent 2px, white 16px)',
              }}
            >
              {props.children}
              <Context.Provider value={context}>
                <RootNodeList />
              </Context.Provider>
            </ScrollViewport>
          </ScrollArea>
          {props.footer}
        </div>
      </Base.SidebarList>
    );
  },
);

Sidebar.displayName = 'Sidebar';

const SeparatorNode = memo(({ item }: { item: PageTree.Separator }) => {
  return (
    <p className="mb-2 mt-8 px-2 text-sm font-medium first:mt-0">{item.name}</p>
  );
});

SeparatorNode.displayName = 'SeparatorNode';

function RootNodeList() {
  const { root } = useTreeContext();
  const { components } = useInternalContext();

  return (
    <div className="px-2 py-4 md:px-3">
      {renderList(root.children, 0, components)}
    </div>
  );
}

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

const PageNode = memo(({ item }: { item: PageTree.Item }) => {
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

PageNode.displayName = 'PageNode';

const FolderNode = memo(
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
          <div className="ms-2 border-s py-1.5 ps-1">
            {renderList(item.children, level, components)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
);

FolderNode.displayName = 'FolderNode';

function useInternalContext(): InternalContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('<Sidebar /> component required.');

  return ctx;
}
