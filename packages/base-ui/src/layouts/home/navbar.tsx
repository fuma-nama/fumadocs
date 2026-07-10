'use client';
import type { ComponentProps } from 'react';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { NavigationMenu as Primitive } from '@base-ui/react/navigation-menu';
import { cn } from '@/utils/cn';
import { navItemVariants } from './slots/header';

export function NavbarMenu({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={(s) => cn('list-none', typeof className === 'function' ? className(s) : className)}
      {...props}
    >
      {children}
    </Primitive.Item>
  );
}

export function NavbarMenuContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      {...props}
      className={(s) =>
        cn(
          'h-full w-(--anchor-width) max-w-(--available-width) p-3',
          'transition-[opacity,transform,translate] duration-(--duration) ease-(--easing)',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
          'data-starting-style:data-[activation-direction=left]:-translate-x-1/2',
          'data-starting-style:data-[activation-direction=right]:translate-x-1/2',
          'data-ending-style:data-[activation-direction=left]:translate-x-1/2',
          'data-ending-style:data-[activation-direction=right]:-translate-x-1/2',
          'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3',
          typeof className === 'function' ? className(s) : className,
        )
      }
    />
  );
}

export function NavbarMenuTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      {...props}
      className={(s) =>
        cn(
          navItemVariants(),
          'text-sm rounded-md',
          typeof className === 'function' ? className(s) : className,
        )
      }
    >
      {children}
    </Primitive.Trigger>
  );
}

export function NavbarMenuLink(props: LinkProps) {
  return (
    <Primitive.Link
      render={
        <Link
          {...props}
          className={cn(
            'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
            props.className,
          )}
        >
          {props.children}
        </Link>
      }
    />
  );
}
