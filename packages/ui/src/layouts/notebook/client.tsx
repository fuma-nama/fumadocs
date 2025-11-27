'use client';
import { cn } from '@/utils/cn';
import {
  type ComponentProps,
  createContext,
  Fragment,
  type HTMLAttributes,
  type ReactNode,
  use,
  useMemo,
} from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { ChevronDown } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { isTabActive } from '@/utils/is-active';
import type { SidebarTabWithProps } from '@/layouts/shared/sidebar-tab';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';
import { LinkItem, type LinkItemType } from '../shared/link-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const LayoutContext = createContext<
  | (LayoutInfo & {
      isNavTransparent: boolean;
    })
  | null
>(null);

export interface LayoutInfo {
  tabMode: 'sidebar' | 'navbar';
  navMode: 'top' | 'auto';
}

export function LayoutContextProvider({
  navTransparentMode = 'none',
  navMode,
  tabMode,
  children,
}: LayoutInfo & {
  navTransparentMode?: 'always' | 'top' | 'none';
  children: ReactNode;
}) {
  const isTop =
    useIsScrollTop({ enabled: navTransparentMode === 'top' }) ?? true;
  const isNavTransparent =
    navTransparentMode === 'top' ? isTop : navTransparentMode === 'always';

  return (
    <LayoutContext
      value={useMemo(
        () => ({
          isNavTransparent,
          navMode,
          tabMode,
        }),
        [isNavTransparent, navMode, tabMode],
      )}
    >
      {children}
    </LayoutContext>
  );
}

export function LayoutHeader(props: ComponentProps<'header'>) {
  const { open } = useSidebar();
  const { isNavTransparent } = use(LayoutContext)!;

  return (
    <header data-transparent={isNavTransparent && !open} {...props}>
      {props.children}
    </header>
  );
}

export function LayoutBody({
  className,
  style,
  children,
  ...props
}: ComponentProps<'div'>) {
  const { navMode } = use(LayoutContext)!;
  const { collapsed } = useSidebar();

  return (
    <div
      id="nd-notebook-layout"
      className={cn(
        'grid transition-[grid-template-columns] overflow-x-clip',
        className,
      )}
      style={
        {
          gridTemplate:
            navMode === 'top'
              ? `". header header header ."
        "sidebar sidebar toc-popover toc-popover ."
        "sidebar sidebar main toc toc" 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, var(--fd-page-col)) var(--fd-toc-width) minmax(min-content, 1fr)`
              : `"sidebar sidebar header header ."
        "sidebar sidebar toc-popover toc-popover ."
        "sidebar sidebar main toc ." 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, var(--fd-page-col)) var(--fd-toc-width) minmax(min-content, 1fr)`,
          '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
          '--fd-page-col':
            'calc(var(--fd-layout-width) - var(--fd-toc-width) - var(--fd-sidebar-width))',
          gridAutoColumns: 'auto',
          gridAutoRows: 'auto',
          ...style,
        } as object
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function LayoutHeaderTabs({
  options,
  className,
  ...props
}: ComponentProps<'div'> & {
  options: SidebarTabWithProps[];
}) {
  const pathname = usePathname();
  const selectedIdx = useMemo(() => {
    return options.findLastIndex((option) => isTabActive(option, pathname));
  }, [options, pathname]);

  return (
    <div className={cn('flex flex-row items-end gap-6', className)} {...props}>
      {options.map((option, i) => {
        const {
          title,
          url,
          unlisted,
          props: { className, ...rest } = {},
        } = option;
        const isSelected = selectedIdx === i;

        return (
          <Link
            key={i}
            href={url}
            className={cn(
              'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
              unlisted && !isSelected && 'hidden',
              isSelected && 'border-fd-primary text-fd-primary',
              className,
            )}
            {...rest}
          >
            {title}
          </Link>
        );
      })}
    </div>
  );
}

export function NavbarLinkItem({
  item,
  className,
  ...props
}: { item: LinkItemType } & HTMLAttributes<HTMLElement>) {
  if (item.type === 'custom') return item.children;

  if (item.type === 'menu') {
    return (
      <Popover>
        <PopoverTrigger
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground has-data-[active=true]:text-fd-primary',
            className,
          )}
          {...props}
        >
          {item.url ? (
            <LinkItem item={item as { url: string }}>{item.text}</LinkItem>
          ) : (
            item.text
          )}
          <ChevronDown className="size-3" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          {item.items.map((child, i) => {
            if (child.type === 'custom')
              return <Fragment key={i}>{child.children}</Fragment>;

            return (
              <LinkItem
                key={i}
                item={child}
                className="inline-flex items-center gap-2 rounded-md p-2 text-start hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4"
              >
                {child.icon}
                {child.text}
              </LinkItem>
            );
          })}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <LinkItem
      item={item}
      className={cn(
        'text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary',
        className,
      )}
      {...props}
    >
      {item.text}
    </LinkItem>
  );
}
