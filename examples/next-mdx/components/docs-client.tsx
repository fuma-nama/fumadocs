'use client';

import { Sidebar as SidebarIcon } from 'lucide-react';
import { type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { useNav } from 'fumadocs-ui/contexts/layout';
import { SidebarCollapseTrigger } from '@/components/layout/sidebar';
import { SearchToggle } from '@/components/layout/search-toggle';

export function Navbar(props: ComponentProps<'header'>) {
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'fixed top-(--fd-banner-height) inset-x-0 z-30 flex items-center ps-4 pe-2.5 border-b transition-colors backdrop-blur-sm',
        !isTransparent && 'bg-fd-background/80',
        props.className,
      )}
    >
      {props.children}
    </header>
  );
}

export function LayoutBody(props: ComponentProps<'main'>) {
  const { collapsed } = useSidebar();

  return (
    <main
      id="nd-docs-layout"
      {...props}
      className={cn(
        'flex flex-1 flex-col pt-(--fd-nav-height) transition-[padding]',
        props.className,
      )}
      style={{
        ...props.style,
        paddingInlineStart: collapsed
          ? 'min(calc(100vw - var(--fd-page-width)), var(--fd-sidebar-width))'
          : 'calc(var(--fd-sidebar-width) + var(--fd-layout-offset))',
        paddingInlineEnd: collapsed ? '0px' : 'var(--fd-layout-offset)',
      }}
    >
      {props.children}
    </main>
  );
}

export function CollapsibleControl() {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'fixed flex shadow-lg transition-opacity rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 max-md:hidden xl:start-4 max-xl:end-4',
        !collapsed && 'pointer-events-none opacity-0',
      )}
      style={{
        top: 'calc(var(--fd-banner-height) + var(--fd-tocnav-height) + var(--spacing) * 4)',
      }}
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
