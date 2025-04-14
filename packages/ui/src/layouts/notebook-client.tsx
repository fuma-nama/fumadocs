'use client';
import { cn } from '@/utils/cn';
import { type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/contexts/layout';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { isActive } from '@/utils/is-active';
import type { Option } from '@/components/layout/root-toggle';

export function Navbar({
  mode,
  ...props
}: HTMLAttributes<HTMLElement> & { mode: 'top' | 'auto' }) {
  const { open, collapsed } = useSidebar();
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'fixed inset-x-0 top-(--fd-banner-height) z-10 px-(--fd-layout-offset) backdrop-blur-sm transition-colors',
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

export function NavbarSidebarTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { open } = useSidebar();

  return (
    <SidebarTrigger
      {...props}
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
        }),
        props.className,
      )}
    >
      {open ? <X /> : <Menu />}
    </SidebarTrigger>
  );
}

export function LayoutTabs(props: HTMLAttributes<HTMLElement>) {
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

function useIsSelected(item: Option) {
  const pathname = usePathname();

  return item.urls
    ? item.urls.has(pathname.endsWith('/') ? pathname.slice(0, -1) : pathname)
    : isActive(item.url, pathname, true);
}

export function LayoutTab(item: Option) {
  const { closeOnRedirect } = useSidebar();
  const selected = useIsSelected(item);

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

export function SidebarLayoutTab({
  item,
  ...props
}: { item: Option } & HTMLAttributes<HTMLElement>) {
  const selected = useIsSelected(item);

  return (
    <Link
      {...props}
      className={cn(
        'flex flex-row items-center px-2 -mx-2 py-1.5 gap-2.5 text-fd-muted-foreground [&_svg]:!size-4.5',
        selected
          ? 'text-fd-primary font-medium'
          : 'hover:text-fd-accent-foreground',
        props.className,
      )}
      data-active={selected}
      href={item.url}
    >
      {item.icon}
      {item.title}
    </Link>
  );
}
