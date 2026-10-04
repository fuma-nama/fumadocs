'use client';
import type { ComponentProps } from 'react';
import { SidebarIcon } from 'lucide-react';
import { SidebarTrigger } from '@/components/sidebar/base';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useSpaciousLayout } from '..';

/** the mobile navbar */
export function Header({ className, ...props }: ComponentProps<'header'>) {
  const { slots } = useSpaciousLayout();

  return (
    <header
      id="nd-subnav"
      className={cn(
        'sticky top-(--fd-banner-height,0px) z-30 [grid-area:header] flex items-center h-(--fd-header-height) ps-4 pe-2.5 bg-fd-card [anchor-name:--fd-top-bar] md:hidden',
        className,
      )}
      {...props}
    >
      <slots.navTitle className="inline-flex items-center gap-2.5 me-auto font-semibold" />
      {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
      <SidebarTrigger
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm', className: 'p-2' })}
      >
        <SidebarIcon />
      </SidebarTrigger>
    </header>
  );
}
