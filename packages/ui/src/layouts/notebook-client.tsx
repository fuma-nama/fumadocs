'use client';
import { cn } from '@/utils/cn';
import { type ComponentProps } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/contexts/layout';
import { buttonVariants } from '@/components/ui/button';
import { Sidebar as SidebarIcon } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { isActive } from '@/utils/is-active';
import type { Option } from '@/components/layout/root-toggle';

export function Navbar({
  mode,
  ...props
}: ComponentProps<'header'> & { mode: 'top' | 'auto' }) {
  const { open, collapsed } = useSidebar();
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'fixed flex flex-col inset-x-0 top-(--fd-banner-height) z-10 px-(--fd-layout-offset) h-(--fd-nav-height) backdrop-blur-sm transition-colors',
        (!isTransparent || open) && 'bg-fd-background/80',
        mode === 'auto' &&
          !collapsed &&
          'ps-[calc(var(--fd-layout-offset)+var(--fd-sidebar-width))]',
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
  ...props
}: ComponentProps<'button'>) {
  const { setOpen } = useSidebar();

  return (
    <button
      {...props}
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

export function LayoutTabs(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-end gap-6 overflow-auto',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function LayoutTab(item: Option) {
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();
  const selected = item.urls
    ? item.urls.has(pathname.endsWith('/') ? pathname.slice(0, -1) : pathname)
    : isActive(item.url, pathname, true);

  return (
    <Link
      className={cn(
        'inline-flex items-center py-2.5 border-b border-transparent gap-2 text-fd-muted-foreground text-sm text-nowrap',
        selected && 'text-fd-foreground font-medium border-fd-primary',
      )}
      href={item.url}
      onClick={() => {
        closeOnRedirect.current = false;
      }}
    >
      {item.title}
    </Link>
  );
}
