'use client';

import type { ComponentProps } from 'react';
import { useDocsLayout } from '../client';
import { cn } from '@/utils/cn';
import { SidebarIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export function Header(props: ComponentProps<'header'>) {
  const {
    isNavTransparent,
    slots,
    props: { nav },
  } = useDocsLayout();

  if (nav?.component) return nav.component;
  return (
    <header
      id="nd-subnav"
      data-transparent={isNavTransparent}
      {...props}
      className={cn(
        '[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex items-center ps-4 pe-2.5 border-b transition-colors backdrop-blur-sm h-(--fd-header-height) md:hidden max-md:layout:[--fd-header-height:--spacing(14)] data-[transparent=false]:bg-fd-background/80',
        props.className,
      )}
    >
      {slots.navTitle && (
        <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold" />
      )}
      <div className="flex-1">{nav?.children}</div>
      {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
      {slots.sidebar && (
        <slots.sidebar.trigger
          className={cn(
            buttonVariants({
              color: 'ghost',
              size: 'icon-sm',
              className: 'p-2',
            }),
          )}
        >
          <SidebarIcon />
        </slots.sidebar.trigger>
      )}
    </header>
  );
}
