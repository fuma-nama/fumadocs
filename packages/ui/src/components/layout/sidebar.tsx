import { cva } from 'class-variance-authority';
import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { hasActive, isActive } from '@/utils/shared';
import type { LinkItemType } from '@/layout';
import { LinkItem } from '@/components/layout/link-item';
import { LargeSearchToggle } from '@/components/layout/search-toggle';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
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
   * @defaultValue 1
   */
  defaultOpenLevel?: number;

  /**
   * Customise each of the component
   */
  components?: Partial<Components>;
  banner?: React.ReactNode;
  bannerProps?: HTMLAttributes<HTMLDivElement>;

  footer?: React.ReactNode;
  footerProps?: HTMLAttributes<HTMLDivElement>;
}

interface InternalContext {
  defaultOpenLevel: number;
  components: Components;
}

interface Components {
  Item: React.FC<{ item: PageTree.Item }>;
  Folder: React.FC<{ item: PageTree.Folder; level: number }>;
  Separator: React.FC<{ item: PageTree.Separator }>;
}

const itemVariants = cva(
  'flex w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors duration-100 [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-primary/10 font-medium text-primary',
        false:
          'hover:bg-accent/50 hover:text-accent-foreground/80 hover:transition-none',
      },
    },
  },
);

const defaultComponents: Components = {
  Folder: FolderNode,
  Separator: SeparatorNode,
  Item: PageNode,
};

const Context = createContext<InternalContext>({
  defaultOpenLevel: 1,
  components: defaultComponents,
});

export function Sidebar({
  footer,
  components,
  defaultOpenLevel = 1,
  banner,
  items,
  aside,
  bannerProps,
  footerProps,
}: SidebarProps & {
  aside?: HTMLAttributes<HTMLElement> & Record<string, unknown>;
}): React.ReactElement {
  const search = useSearchContext();
  const context = useMemo<InternalContext>(
    () => ({
      defaultOpenLevel,
      components: { ...defaultComponents, ...components },
    }),
    [components, defaultOpenLevel],
  );

  return (
    <Context.Provider value={context}>
      <Base.SidebarList
        id="nd-sidebar"
        blockScrollingWidth={768} // md
        {...aside}
        className={cn(
          'fixed z-30 flex shrink-0 flex-col bg-card text-sm md:sticky md:top-0 md:h-dvh md:w-[240px] md:border-e xl:w-[260px]',
          'max-md:inset-0 max-md:bg-background/80 max-md:pt-12 max-md:text-[15px] max-md:backdrop-blur-md max-md:data-[open=false]:hidden',
          aside?.className,
        )}
      >
        <div
          {...bannerProps}
          className={cn(
            'flex flex-col gap-2 px-4 pt-2 md:px-3 md:pt-4',
            bannerProps?.className,
          )}
        >
          {banner}
          {search.enabled ? (
            <LargeSearchToggle className="rounded-lg max-md:hidden" />
          ) : null}
        </div>
        <ViewportContent>
          {items.length > 0 && (
            <div className="flex flex-col md:hidden">
              {items.map((item, i) => (
                <LinkItem key={i} item={item} on="menu" />
              ))}
            </div>
          )}
        </ViewportContent>
        <div
          {...footerProps}
          className={cn(
            'flex flex-row items-center border-t px-4 pb-2 pt-1 md:px-3',
            footerProps?.className,
          )}
        >
          {footer}
        </div>
      </Base.SidebarList>
    </Context.Provider>
  );
}

function ViewportContent({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { root } = useTreeContext();

  return (
    <ScrollArea className="flex-1">
      <ScrollViewport
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 2px, white 24px, white calc(100% - 24px), transparent calc(100% - 2px))',
        }}
      >
        <div className="flex flex-col gap-8 px-4 py-6 md:px-3">
          {children}
          <NodeList items={root.children} />
        </div>
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
  const { closeOnRedirect } = useSidebar();
  const active = isActive(url, pathname, false);

  return (
    <Link
      href={url}
      external={external}
      className={cn(itemVariants({ active }))}
      onClick={useCallback(() => {
        closeOnRedirect.current = !active;
      }, [closeOnRedirect, active])}
    >
      {icon ?? (external ? <ExternalLinkIcon /> : null)}
      {name}
    </Link>
  );
}

function FolderNode({
  item: { name, children, index, icon, defaultOpen = false },
  level,
}: {
  item: PageTree.Folder;
  level: number;
}): React.ReactElement {
  const { defaultOpenLevel } = useContext(Context);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();

  const active = index !== undefined && isActive(index.url, pathname, false);
  const childActive = useMemo(
    () => hasActive(children, pathname),
    [children, pathname],
  );

  const shouldExtend =
    active || childActive || defaultOpenLevel >= level || defaultOpen;
  const [extend, setExtend] = useState(shouldExtend);

  useEffect(() => {
    if (shouldExtend) setExtend(true);
  }, [shouldExtend]);

  const onClick: React.MouseEventHandler = useCallback(
    (e) => {
      if (e.target !== e.currentTarget || active) {
        setExtend((prev) => !prev);
        e.preventDefault();
      } else {
        closeOnRedirect.current = !active;
      }
    },
    [closeOnRedirect, active],
  );

  const content = (
    <>
      {icon}
      {name}
      <ChevronDown
        className={cn('ms-auto transition-transform', !extend && '-rotate-90')}
      />
    </>
  );

  return (
    <Collapsible open={extend} onOpenChange={setExtend}>
      {index ? (
        <Link
          className={cn(itemVariants({ active }))}
          href={index.url}
          onClick={onClick}
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
          items={children}
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
