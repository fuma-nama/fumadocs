'use client';

import { Sidebar as SidebarIcon } from 'lucide-react';
import { type ComponentProps, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/contexts/layout';
import { SidebarCollapseTrigger } from './sidebar';
import { SearchToggle } from '../shared/search-toggle';
import type { Option } from './root-toggle';
import { usePathname } from 'fumadocs-core/framework';
import { isTabActive } from '@/utils/is-active';
import Link from 'fumadocs-core/link';

export function LayoutHeader(props: ComponentProps<'header'>) {
  const { isTransparent } = useNav();

  return (
    <header data-transparent={isTransparent} {...props}>
      {props.children}
    </header>
  );
}

export function CollapsibleControl() {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'fixed flex top-4 shadow-lg transition-opacity rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 max-md:hidden xl:start-4 max-xl:end-4',
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
  options: Option[];
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
  option: { title, url, unlisted, props },
  selected = false,
}: {
  option: Option;
  selected?: boolean;
}) {
  return (
    <Link
      href={url}
      {...props}
      className={cn(
        'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
        unlisted && !selected && 'hidden',
        selected && 'border-fd-primary text-fd-primary',
        props?.className,
      )}
    >
      {title}
    </Link>
  );
}
