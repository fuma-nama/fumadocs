'use client';
import { useSidebar } from '@/contexts/sidebar';
import { type HTMLAttributes, useContext } from 'react';
import { NavContext } from '@/components/layout/nav';
import { cn } from '@/utils/cn';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function Navbar(props: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  const { isTransparent } = useContext(NavContext);

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'sticky top-[var(--fd-banner-height)] z-40 flex flex-row items-center border-b border-fd-foreground/10 px-4 transition-colors',
        (!isTransparent || open) && 'bg-fd-background/80 backdrop-blur-lg',
        props.className,
      )}
    >
      {props.children}
    </header>
  );
}

export function NavbarSidebarTrigger() {
  const { open } = useSidebar();

  return (
    <SidebarTrigger
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
          className: '-me-2 md:hidden',
        }),
      )}
    >
      {open ? <X /> : <Menu />}
    </SidebarTrigger>
  );
}
