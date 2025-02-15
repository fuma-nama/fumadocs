'use client';

import { Menu, X } from 'lucide-react';
import { type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/components/layout/nav';
import { SidebarTrigger } from 'fumadocs-core/sidebar';

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
