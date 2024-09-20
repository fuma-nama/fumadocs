import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type HTMLAttributes,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import Link from 'fumadocs-core/link';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { hasActive, isActive } from '@/utils/shared';
import { LinkItem, type LinkItemType } from '@/components/layout/link-item';
import { LargeSearchToggle } from '@/components/layout/search-toggle';
import { useSearchContext } from '@/contexts/search';
import { itemVariants } from '@/components/layout/variants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

export interface SidebarProps {
  items: LinkItemType[];

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
  banner?: React.ReactNode;
  bannerProps?: HTMLAttributes<HTMLDivElement>;

  footer?: React.ReactNode;
  footerProps?: HTMLAttributes<HTMLDivElement>;

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
  Item: React.FC<{ item: PageTree.Item }>;
  Folder: React.FC<{ item: PageTree.Folder; level: number }>;
  Separator: React.FC<{ item: PageTree.Separator }>;
}

const defaultComponents: Components = {
  Folder: FolderNode,
  Separator: SeparatorNode,
  Item: PageNode,
};

const Context = createContext<InternalContext>({
  defaultOpenLevel: 0,
  components: defaultComponents,
  prefetch: true,
});

export function Sidebar({
  components,
  defaultOpenLevel = 0,
  items,
  prefetch = true,
  ...props
}: SidebarProps & {
  aside?: HTMLAttributes<HTMLElement> & Record<string, unknown>;
}): React.ReactElement {
  const search = useSearchContext();
  const hasSearch = search.enabled && !props.hideSearch;
  const context = useMemo<InternalContext>(
    () => ({
      defaultOpenLevel,
      components: { ...defaultComponents, ...components },
      prefetch,
    }),
    [components, defaultOpenLevel, prefetch],
  );

  return (
    <Context.Provider value={context}>
      <Base.SidebarList
        id="nd-sidebar"
        blockScrollingWidth={768} // md
        {...props.aside}
        className={cn(
          'fixed z-30 flex flex-col bg-fd-card text-sm md:sticky md:top-fd-sidebar-top md:h-fd-sidebar-height md:w-[var(--fd-c-sidebar)] md:min-w-[var(--fd-sidebar-width)] md:border-e md:ps-[calc(var(--fd-c-sidebar)-var(--fd-sidebar-width))]',
          'max-md:inset-0 max-md:top-fd-sidebar-top max-md:bg-fd-background/80 max-md:pt-[var(--fd-nav-height)] max-md:text-[15px] max-md:backdrop-blur-md max-md:data-[open=false]:invisible',
          props.aside?.className,
        )}
      >
        {hasSearch || props.banner ? (
          <div
            {...props.bannerProps}
            className={cn(
              'flex flex-col gap-1 px-4 pt-2 md:px-3 md:pt-4',
              !props.banner && 'max-md:hidden',
              props.bannerProps?.className,
            )}
          >
            {props.banner}
            {hasSearch ? (
              <LargeSearchToggle className="rounded-lg max-md:hidden" />
            ) : null}
          </div>
        ) : null}
        <ViewportContent items={items} />
        {props.footer ? (
          <div
            {...props.footerProps}
            className={cn(
              'flex flex-row items-center border-t py-1 max-md:px-4 md:mx-3',
              props.footerProps?.className,
            )}
          >
            {props.footer}
          </div>
        ) : null}
      </Base.SidebarList>
    </Context.Provider>
  );
}

function ViewportContent({
  items,
}: {
  items: LinkItemType[];
}): React.ReactElement {
  const { root } = useTreeContext();

  return (
    <ScrollArea className="flex-1">
      <ScrollViewport
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 2px, white 24px)',
        }}
      >
        {items.length > 0 ? (
          <div className="flex flex-col px-4 pt-6 md:hidden">
            {items.map((item, i) => (
              <LinkItem key={i} item={item} on="menu" />
            ))}
          </div>
        ) : null}
        <NodeList items={root.children} className="px-4 py-6 md:px-3" />
      </ScrollViewport>
    </ScrollArea>
  );
}

interface NodeListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: PageTree.Node[];
  level?: number;
}

function NodeList({
  items,
  level = 0,
  ...props
}: NodeListProps): React.ReactElement {
  const { components } = useContext(Context);

  return (
    <div {...props}>
      {items.map((item, i) => {
        const id = `${item.type}_${i.toString()}`;

        switch (item.type) {
          case 'separator':
            return <components.Separator key={id} item={item} />;
          case 'folder':
            return <components.Folder key={id} item={item} level={level + 1} />;
          default:
            return <components.Item key={item.url} item={item} />;
        }
      })}
    </div>
  );
}

function PageNode({
  item: { icon, external = false, url, name },
}: {
  item: PageTree.Item;
}): React.ReactElement {
  const pathname = usePathname();
  const active = isActive(url, pathname, false);
  const { prefetch } = useContext(Context);

  return (
    <Link
      href={url}
      external={external}
      className={cn(itemVariants({ active }))}
      prefetch={prefetch}
    >
      {icon ?? (external ? <ExternalLinkIcon /> : null)}
      {name}
    </Link>
  );
}

function FolderNode({
  item,
  level,
}: {
  item: PageTree.Folder;
  level: number;
}): React.ReactElement {
  const { defaultOpenLevel, prefetch } = useContext(Context);
  const pathname = usePathname();
  const active =
    item.index !== undefined && isActive(item.index.url, pathname, false);
  const childActive = useMemo(
    () => hasActive(item.children, pathname),
    [item.children, pathname],
  );

  const shouldExtend =
    active || childActive || (item.defaultOpen ?? defaultOpenLevel >= level);
  const [open, setOpen] = useState(shouldExtend);

  useOnChange(shouldExtend, (v) => {
    if (v) setOpen(v);
  });

  const onClick: React.MouseEventHandler = useCallback(
    (e) => {
      if (
        // clicking on icon
        (e.target as HTMLElement).hasAttribute('data-icon') ||
        active
      ) {
        setOpen((prev) => !prev);
        e.preventDefault();
      }
    },
    [active],
  );

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
          className={cn(itemVariants({ active }))}
          href={item.index.url}
          onClick={onClick}
          prefetch={prefetch}
        >
          {content}
        </Link>
      ) : (
        <CollapsibleTrigger className={cn(itemVariants({ active }))}>
          {content}
        </CollapsibleTrigger>
      )}
      <CollapsibleContent>
        <NodeList
          className="ms-2 flex flex-col border-s py-2 ps-2"
          items={item.children}
          level={level}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function SeparatorNode({
  item,
}: {
  item: PageTree.Separator;
}): React.ReactElement {
  return <p className="mb-2 mt-8 px-2 font-medium first:mt-0">{item.name}</p>;
}
