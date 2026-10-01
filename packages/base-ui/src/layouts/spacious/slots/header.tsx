'use client';
import type { ComponentProps } from 'react';
import { MenuIcon } from 'lucide-react';
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
        'sticky top-0 z-30 [grid-area:header] flex items-center gap-1 h-14 ps-4 pe-2 border-b bg-fd-background/80 backdrop-blur-md md:hidden',
        className,
      )}
      {...props}
    >
      <slots.navTitle className="inline-flex items-center gap-2 min-w-0 me-auto font-semibold" />
      {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
      <SidebarTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'p-2 text-fd-muted-foreground',
        )}
      >
        <MenuIcon />
      </SidebarTrigger>
    </header>
  );
}
