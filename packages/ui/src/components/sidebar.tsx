import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import type { FileNode, FolderNode, TreeNode } from 'next-docs-zeta/server';
import * as Base from 'next-docs-zeta/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { LayoutContext } from '@/contexts/tree';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ThemeToggle } from './theme-toggle';

export interface SidebarProps {
  banner?: ReactNode;
  footer?: ReactNode;
}

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground [&_svg]:h-4 [&_svg]:w-4',
  {
    variants: {
      active: {
        true: 'bg-primary/10 text-primary',
        false: 'hover:bg-accent/50',
      },
    },
  },
);

export function Sidebar({ banner, footer }: SidebarProps): JSX.Element {
  const [open] = useSidebarCollapse();
  const { tree } = useContext(LayoutContext);

  return (
    <Base.SidebarList
      minWidth={768} // md
      className={cn(
        'flex w-full flex-col text-medium md:sticky md:top-16 md:h-body md:w-[240px] md:text-sm xl:w-[260px]',
        !open && 'hidden',
        'max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:bg-background max-md:pt-16 max-md:data-[open=false]:hidden sm:max-md:max-w-sm sm:max-md:border-l',
      )}
    >
      <ScrollArea className="flex-1">
        <div className="flex flex-col pb-10 pt-4 max-md:px-4 md:pr-4 md:pt-10">
          {banner}
          {tree.children.map((item, i) => (
            // eslint-disable-next-line react/no-array-index-key -- tree nodes have no id
            <Node key={i} item={item} level={1} />
          ))}
        </div>
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
    </Base.SidebarList>
  );
}

function Node({ item, level }: { item: TreeNode; level: number }): JSX.Element {
  if (item.type === 'separator')
    return <p className="mb-2 mt-8 px-2 font-medium first:mt-0">{item.name}</p>;
  if (item.type === 'folder') return <Folder item={item} level={level} />;

  return <Item item={item} />;
}

function Item({ item }: { item: FileNode }): JSX.Element {
  const pathname = usePathname();
  const active = pathname === item.url;

  return (
    <Link href={item.url} className={cn(itemVariants({ active }))}>
      {item.icon}
      {item.name}
    </Link>
  );
}

function hasActive(items: TreeNode[], url: string): boolean {
  return items.some((item) => {
    if (item.type === 'page') {
      return item.url === url;
    }
    if (item.type === 'folder') return hasActive(item.children, url);

    return false;
  });
}

function Folder({
  item: { name, children, index, icon },
  level,
}: {
  item: FolderNode;
  level: number;
}): JSX.Element {
  const { sidebarDefaultOpenLevel = 1 } = useContext(LayoutContext);

  const pathname = usePathname();
  const active = index && pathname === index.url;
  const childActive = useMemo(
    () => hasActive(children, pathname),
    [children, pathname],
  );
  const [extend, setExtend] = useState(
    active || childActive || sidebarDefaultOpenLevel >= level,
  );

  useEffect(() => {
    if (active || childActive) setExtend(true);
  }, [active, childActive]);

  const content = (
    <>
      {icon}
      {name}
      <ChevronDown
        onClick={(e) => {
          setExtend((prev) => !prev);
          e.preventDefault();
        }}
        className={cn('ml-auto transition-transform', !extend && '-rotate-90')}
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
        <div className="ml-4 flex flex-col border-l py-2 pl-2">
          {children.map((item, i) => (
            // eslint-disable-next-line react/no-array-index-key -- tree nodes have no id
            <Node key={i} item={item} level={level + 1} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
