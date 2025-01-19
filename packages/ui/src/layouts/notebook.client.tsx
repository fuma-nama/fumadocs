'use client';
import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/components/layout/nav';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function Navbar(props: HTMLAttributes<HTMLElement>) {
  const { open, collapsed } = useSidebar();
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'fixed inset-x-0 top-[var(--fd-banner-height)] z-10 h-14 pe-[var(--fd-layout-offset)] backdrop-blur-lg transition-colors',
        (!isTransparent || open) && 'bg-fd-background/80',
        props.className,
      )}
      style={
        {
          paddingInlineStart: collapsed
            ? 'calc(var(--fd-layout-offset))'
            : 'calc(var(--fd-layout-offset) + var(--fd-sidebar-width))',
        } as object
      }
    >
      <div className="mx-auto flex size-full flex-row items-center border-b border-fd-foreground/10 px-4 md:gap-1.5">
        {props.children}
      </div>
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
