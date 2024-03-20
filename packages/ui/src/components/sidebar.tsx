import { cva } from 'class-variance-authority';
import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { hasActive, isActive } from '@/utils/shared';
import type { LinkItem } from '@/layout';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ThemeToggle } from './theme-toggle';

export interface SidebarProps {
  items: LinkItem[];

  /**
   * Open folders by default if their level is lower or equal to a specific level
   * (Starting from 1)
   *
   * @defaultValue 1
   */
  defaultOpenLevel?: number;

  components?: Partial<Components>;
  banner?: ReactNode;
  footer?: ReactNode;
}

interface SidebarContext {
  defaultOpenLevel: number;
  components: Components;
}

interface Components {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-primary/10 font-medium text-primary',
        false: 'hover:bg-accent/50 hover:text-accent-foreground/80',
      },
    },
  },
);

const defaultComponents: Components = {
  Folder: FolderNode,
  Separator: SeparatorNode,
  Item: ({ item: { name, ...rest } }) => (
    <BaseItem item={{ text: name, ...rest }} />
  ),
};

const SidebarContext = createContext<SidebarContext>({
  defaultOpenLevel: 1,
  components: defaultComponents,
});

export function Sidebar({
  banner,
  footer,
  components,
  items = [],
  defaultOpenLevel = 1,
}: SidebarProps): JSX.Element {
  const [open] = useSidebarCollapse();
  const { root } = useTreeContext();
  const context = useMemo<SidebarContext>(
    () => ({
      defaultOpenLevel,
      components: { ...defaultComponents, ...components },
    }),
    [components, defaultOpenLevel],
  );

  return (
    <Base.SidebarList
      minWidth={768} // md
      className={cn(
        'flex w-full flex-col text-[15px]',
        !open
          ? 'md:hidden'
          : 'md:sticky md:top-16 md:h-body md:w-[240px] md:text-sm xl:w-[260px]',
        'max-md:fixed max-md:inset-0 max-md:z-40 max-md:bg-background/80 max-md:pt-16 max-md:backdrop-blur-md max-md:data-[open=false]:hidden',
      )}
    >
      <SidebarContext.Provider value={context}>
        <ScrollArea className="flex-1">
          <ScrollViewport>
            <div className="flex flex-col gap-8 pb-10 pt-4 max-md:px-4 md:pr-3 md:pt-10">
              {banner}
              {items.length > 0 && (
                <div className="lg:hidden">
                  {items.map((item) => (
                    <BaseItem key={item.url} item={item} nested />
                  ))}
                </div>
              )}
              <NodeList items={root.children} />
            </div>
          </ScrollViewport>
        </ScrollArea>
        <div
          className={cn(
            'flex flex-row items-center gap-2 border-t py-2 max-md:px-4',
            !footer && 'md:hidden',
          )}
        >
          {footer}
          <ThemeToggle className="md:hidden" />
        </div>
      </SidebarContext.Provider>
    </Base.SidebarList>
  );
}

interface NodeListProps extends HTMLAttributes<HTMLDivElement> {
  items: PageTree.Node[];
  level?: number;
}

function NodeList({ items, level = 0, ...props }: NodeListProps): JSX.Element {
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

function BaseItem({
  item,
  nested = false,
}: {
  item: LinkItem;
  nested?: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const active = isActive(item.url, pathname, nested);
  const icon = item.icon ?? (item.external ? <ExternalLinkIcon /> : null);

  return (
    <Link
      href={item.url}
      external={item.external}
      className={cn(itemVariants({ active }))}
    >
      {icon}
      {item.text}
    </Link>
  );
}

function FolderNode({
  item: { name, children, index, icon, defaultOpen = false },
  level,
}: {
  item: PageTree.Folder;
  level: number;
}): JSX.Element {
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

  const content = (
    <>
      {icon}
      {name}
      <ChevronDown
        onClick={(e) => {
          setExtend((prev) => !prev);
          e.preventDefault();
        }}
        className={cn('ms-auto transition-transform', !extend && '-rotate-90')}
      />
    </>
  );

  return (
    <Collapsible
      open={extend}
      onOpenChange={!index || active ? setExtend : undefined}
    >
      <CollapsibleTrigger
        className={cn(itemVariants({ active, className: 'w-full' }))}
        asChild
      >
        {index ? (
          <Link href={index.url}>{content}</Link>
        ) : (
          <button type="button">{content}</button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <NodeList
          className="ms-4 flex flex-col border-s py-2 ps-2"
          items={children}
          level={level}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function SeparatorNode({ item }: { item: PageTree.Separator }): JSX.Element {
  return <p className="mb-2 mt-8 px-2 font-medium first:mt-0">{item.name}</p>;
}
