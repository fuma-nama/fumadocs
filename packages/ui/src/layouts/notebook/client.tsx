'use client';
import { cn } from '@/utils/cn';
import { type ComponentProps, useMemo } from 'react';
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
        'flex flex-1 flex-col transition-[padding] pt-(--fd-nav-height) fd-notebook-layout',
        !collapsed && 'mx-(--fd-layout-offset)',
        props.className,
      )}
      style={{
        ...props.style,
        paddingInlineStart: collapsed
          ? 'min(calc(100vw - var(--fd-page-width)), var(--fd-sidebar-width))'
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

export function LayoutTabs({
  options,
  ...props
}: ComponentProps<'div'> & {
  options: Option[];
}) {
  const pathname = usePathname();
  const selected = useMemo(() => {
    const url = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    return options.findLast((option) => {
      if (option.urls) {
        return option.urls.has(url);
      }

      return isActive(option.url, pathname, true);
    });
  }, [options, pathname]);

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-4 overflow-auto',
        props.className,
      )}
    >
      {options.map((option) => (
        <LayoutTab
          key={option.url}
          selected={selected === option}
          option={option}
        />
      ))}
    </div>
  );
}

function LayoutTab({
  option,
  selected = false,
}: {
  option: Option;
  selected?: boolean;
}) {
  return (
    <Link
      className={cn(
        'inline-flex border-b border-transparent transition-colors items-center py-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap',
        option.unlisted && !selected && 'hidden',
        selected && 'border-fd-primary text-fd-primary',
      )}
      href={option.url}
    >
      {option.title}
    </Link>
  );
}
