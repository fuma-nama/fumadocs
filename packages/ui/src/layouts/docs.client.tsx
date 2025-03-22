'use client';

import { Menu, SidebarIcon, X } from 'lucide-react';
import { type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/contexts/layout';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { SidebarCollapseTrigger } from '@/components/layout/sidebar';
import { SearchToggle } from '@/components/layout/search-toggle';

export function Navbar(props: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'sticky top-(--fd-banner-height) z-30 flex h-14 flex-row items-center border-b border-fd-foreground/10 px-4 backdrop-blur-lg transition-colors',
        (!isTransparent || open) && 'bg-fd-background/80',
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

export function CollapsibleControl() {
  const { collapsed } = useSidebar();
  if (!collapsed) return;

  return (
    <div className="fixed flex flex-row items-center animate-fd-fade-in rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 top-12 shadow-md max-md:hidden xl:top-4 xl:start-4 max-xl:end-4">
      <SidebarCollapseTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon-sm',
          }),
          'rounded-lg',
        )}
      >
        <SidebarIcon />
      </SidebarCollapseTrigger>
      <SearchToggle size="icon-sm" className="rounded-lg" />
    </div>
  );
}
