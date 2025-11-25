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
import { useSidebar } from '@/contexts/sidebar';
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

  return (
    <LayoutContext
      value={{
        isNavTransparent:
          navTransparentMode === 'top'
            ? isTop
            : navTransparentMode === 'always',
      }}
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
        'grid transition-[grid-template-columns] overflow-x-clip',
        className,
      )}
      data-sidebar-collapsed={collapsed}
      style={
        {
          gridTemplate: `". . . ."
        ". sidebar header toc"
        ". sidebar toc-popover toc"
        ". sidebar main toc" 1fr / auto minmax(var(--fd-sidebar-col), 1fr) minmax(0, var(--fd-page-width)) minmax(min-content, 1fr)`,
          '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
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
