import { cva } from 'class-variance-authority';
import { ChevronDown, ExternalLinkIcon, SidebarIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { hasActive, isActive } from '@/utils/shared';
import type { LinkItem } from '@/layout';
import { buttonVariants } from '@/theme/variants';
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

  collapsible?: boolean;

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
  'flex w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground [&_svg]:size-4',
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
  Item: ({ item }) => (
    <BaseItem
      url={item.url}
      external={item.external}
      icon={item.icon}
      text={item.name}
    />
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
  collapsible = true,
}: SidebarProps): React.ReactElement {
  const [open, setOpen] = useSidebarCollapse();
  const { root } = useTreeContext();
  const alwaysShowFooter = Boolean(footer) || collapsible;
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
        'flex w-full flex-col text-[15px] md:sticky md:top-16 md:h-body md:w-[240px] md:text-sm xl:w-[260px]',
        !open && 'md:!w-0',
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
                    <BaseItem key={item.url} {...item} nested />
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
            !alwaysShowFooter && 'md:hidden',
          )}
        >
          {footer}
          <ThemeToggle className="md:hidden" />
          {collapsible ? (
            <button
              type="button"
              aria-label="Trigger Sidebar"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon',
                }),
                'max-md:hidden',
                open ? 'ms-auto' : 'absolute -right-6 bottom-2',
              )}
              onClick={() => {
                setOpen(!open);
              }}
            >
              <SidebarIcon />
            </button>
          ) : null}
        </div>
      </SidebarContext.Provider>
    </Base.SidebarList>
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

function BaseItem({
  icon,
  external = false,
  url,
  text,
  nested = false,
}: {
  icon?: React.ReactNode;
  external?: boolean;
  text: React.ReactNode;
  url: string;
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
      {text}
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

  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget || active) {
        setExtend((prev) => !prev);
        e.preventDefault();
      }
    },
    [active],
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
          className="ms-4 flex flex-col border-s py-2 ps-2"
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
