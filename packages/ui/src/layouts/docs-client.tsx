'use client';

import { Sidebar as SidebarIcon } from 'lucide-react';
import { type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/contexts/layout';
import { SidebarCollapseTrigger } from '@/components/layout/sidebar';
import { SearchToggle } from '@/components/layout/search-toggle';

export function Navbar(props: ComponentProps<'header'>) {
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'fixed top-(--fd-banner-height) inset-x-0 z-30 flex items-center px-4 border-b transition-colors backdrop-blur-sm',
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
        'flex flex-1 flex-col transition-[margin]',
        props.className,
      )}
      style={{
        ...props.style,
        marginInlineStart: collapsed
          ? 'max(0px, min(calc(100vw - var(--fd-page-width)), var(--fd-sidebar-width)))'
          : 'var(--fd-sidebar-width)',
      }}
    >
      {props.children}
    </main>
  );
}

export function NavbarSidebarTrigger({
  className,
  sidebarEnabled = true,
  ...props
}: ComponentProps<'button'> & { sidebarEnabled?: boolean }) {
  const { setOpen } = useSidebar();

  if (!sidebarEnabled) return null;
  return (
    <button
      {...props}
      aria-label="Open Sidebar"
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon-sm',
          className,
        }),
      )}
      onClick={() => setOpen((prev) => !prev)}
    >
      <SidebarIcon />
    </button>
  );
}

export function CollapsibleControl() {
  const { collapsed } = useSidebar();
  if (!collapsed) return;

  return (
    <div
      className="fixed flex shadow-lg animate-fd-fade-in rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 xl:start-4 max-xl:end-4"
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
