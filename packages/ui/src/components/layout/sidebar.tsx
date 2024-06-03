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
import { LinkItem } from '@/components/link-item';
import { LargeSearchToggle } from '@/components/layout/search-toggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { ThemeToggle } from './theme-toggle';

export interface SidebarProps {
  items: LinkItemType[];

  /**
   * Open folders by default if their level is lower or equal to a specific level
   * (Starting from 1)
   *
   * @defaultValue 1
   */
  defaultOpenLevel?: number;

  components?: Partial<Components>;
  banner?: React.ReactNode;
  footer?: React.ReactNode;
}

interface SidebarContext {
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

const SidebarContext = createContext<SidebarContext>({
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
}: SidebarProps & {
  aside?: HTMLAttributes<HTMLElement> & Record<string, unknown>;
}): React.ReactElement {
  const context = useMemo<SidebarContext>(
    () => ({
      defaultOpenLevel,
      components: { ...defaultComponents, ...components },
    }),
    [components, defaultOpenLevel],
  );
  return (
    <SidebarContext.Provider value={context}>
      <Base.SidebarList
        blockScrollingWidth={768} // md
        {...aside}
        className={cn(
          'flex w-full flex-col text-[15px] md:fixed md:inset-y-0 md:start-0 md:w-[240px] md:border-e md:bg-card md:text-sm xl:w-[260px]',
          'max-md:fixed max-md:inset-0 max-md:bg-background/80 max-md:backdrop-blur-md max-md:data-[open=false]:hidden',
          aside?.className,
        )}
      >
        <div className="flex flex-col gap-4 border-b p-3 md:p-2 md:pt-10">
          {banner}
          <LargeSearchToggle />
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
        <div className="flex flex-row items-center gap-2 border-t p-3 md:p-2">
          <ThemeToggle />
          {footer}
        </div>
      </Base.SidebarList>
    </SidebarContext.Provider>
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
      <ScrollViewport>
        <div className="flex flex-col gap-8 p-4 pb-10 md:px-3 md:pt-10">
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
  const { components } = useContext(SidebarContext);

  return (
    <div {...props}>
      {items.map((item) => {
        const id = `${item.type}_${item.name}`;

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
  nested = false,
}: {
  item: PageTree.Item;
  nested?: boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const active = isActive(url, pathname, nested);

  return (
    <Link
      href={url}
      external={external}
      className={cn(itemVariants({ active }))}
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
  const { defaultOpenLevel } = useContext(SidebarContext);
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

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget || active) {
        setExtend((prev) => !prev);
        e.preventDefault();
      }
    },
    [active],
  );

  return (
    <Collapsible open={extend} onOpenChange={setExtend}>
      {index ? (
        <Link
          className={cn(itemVariants({ active }))}
          href={index.url}
          onClick={onClick}
        >
          {icon}
          {name}
          <ChevronDown
            className={cn(
              'ms-auto transition-transform',
              !extend && '-rotate-90',
            )}
          />
        </Link>
      ) : (
        <CollapsibleTrigger className={cn(itemVariants({ active }))}>
          {icon}
          {name}
          <ChevronDown
            className={cn(
              'ms-auto transition-transform',
              !extend && '-rotate-90',
            )}
          />
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
