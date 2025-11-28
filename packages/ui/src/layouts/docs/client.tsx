'use client';

import { Sidebar as SidebarIcon } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useMemo,
} from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/components/sidebar/base';
import { SidebarCollapseTrigger } from './sidebar';
import { SearchToggle } from '../shared/search-toggle';
import { usePathname } from 'fumadocs-core/framework';
import { isTabActive } from '@/utils/is-active';
import Link from 'fumadocs-core/link';
import type { SidebarTab } from '@/utils/get-sidebar-tabs';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';

export const LayoutContext = createContext<{
  isNavTransparent: boolean;
} | null>(null);

export function LayoutContextProvider({
  navTransparentMode = 'none',
  children,
}: {
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
        }),
        [isNavTransparent],
      )}
    >
      {children}
    </LayoutContext>
  );
}

export function LayoutHeader(props: ComponentProps<'header'>) {
  const { isNavTransparent } = use(LayoutContext)!;

  return (
    <header data-transparent={isNavTransparent} {...props}>
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
  const { collapsed } = useSidebar();

  return (
    <div
      id="nd-docs-layout"
      className={cn(
        'grid transition-[grid-template-columns] overflow-x-clip min-h-(--fd-docs-height) [--fd-docs-height:100dvh] [--fd-header-height:0px] [--fd-toc-popover-height:0px] [--fd-sidebar-width:0px] [--fd-toc-width:0px]',
        className,
      )}
      data-sidebar-collapsed={collapsed}
      style={
        {
          gridTemplate: `"sidebar header toc"
        "sidebar toc-popover toc"
        "sidebar main toc" 1fr / minmax(var(--fd-sidebar-col), 1fr) minmax(0, var(--fd-page-col)) minmax(min-content, 1fr)`,
          '--fd-docs-row-1': 'var(--fd-banner-height, 0px)',
          '--fd-docs-row-2':
            'calc(var(--fd-docs-row-1) + var(--fd-header-height))',
          '--fd-docs-row-3':
            'calc(var(--fd-docs-row-2) + var(--fd-toc-popover-height))',
          '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
          '--fd-page-col':
            'calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))',
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

export function CollapsibleControl() {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'fixed flex top-16 shadow-lg transition-opacity rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 max-md:hidden xl:top-4 xl:start-4 max-xl:end-4',
        !collapsed && 'pointer-events-none opacity-0',
      )}
    >
      <SidebarCollapseTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon-sm',
            className: 'rounded-lg',
          }),
        )}
      >
        <SidebarIcon />
      </SidebarCollapseTrigger>
      <SearchToggle className="rounded-lg" hideIfDisabled />
    </div>
  );
}

export function LayoutTabs({
  options,
  ...props
}: ComponentProps<'div'> & {
  options: SidebarTab[];
}) {
  const pathname = usePathname();
  const selected = useMemo(() => {
    return options.findLast((option) => isTabActive(option, pathname));
  }, [options, pathname]);

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-end gap-6 overflow-auto [grid-area:main]',
        props.className,
      )}
    >
      {options.map((option, i) => (
        <Link
          key={i}
          href={option.url}
          className={cn(
            'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
            option.unlisted && selected !== option && 'hidden',
            selected === option && 'border-fd-primary text-fd-primary',
          )}
        >
          {option.title}
        </Link>
      ))}
    </div>
  );
}
