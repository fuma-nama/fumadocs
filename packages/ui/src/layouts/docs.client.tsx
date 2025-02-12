'use client';

import { ChevronDown, Menu, X } from 'lucide-react';
import { type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cva } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';
import { useNav } from '@/components/layout/nav';
import { SidebarTrigger } from 'fumadocs-core/sidebar';

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md px-3 py-2.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none md:px-2 md:py-1.5 [&_svg]:size-4',
);

export function Navbar(props: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'sticky top-[var(--fd-banner-height)] z-30 flex h-14 flex-row items-center border-b border-fd-foreground/10 px-4 backdrop-blur-lg transition-colors',
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

interface MenuItemProps extends HTMLAttributes<HTMLElement> {
  item: LinkItemType;
}

function MenuItem({ item, ...props }: MenuItemProps) {
  if (item.type === 'custom')
    return (
      <div {...props} className={cn('grid', props.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <Collapsible className="flex flex-col">
        <CollapsibleTrigger
          {...props}
          className={cn(itemVariants(), 'group', props.className)}
        >
          {item.icon}
          {item.text}
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col py-2 ps-2">
            {item.items.map((child, i) => (
              <MenuItem key={i} item={child} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <BaseLinkItem
      item={item}
      {...props}
      className={cn(
        item.type === 'button'
          ? buttonVariants({
              color: 'secondary',
              className: 'gap-1.5 [&_svg]:size-4',
            })
          : itemVariants(),
        props.className,
      )}
    >
      {item.icon}
      {item.text}
    </BaseLinkItem>
  );
}
