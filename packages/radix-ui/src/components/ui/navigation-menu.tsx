'use client';
import * as React from 'react';
import * as Primitive from '@radix-ui/react-navigation-menu';
import { cn } from '@/utils/cn';

export type NavigationMenuContentProps = Primitive.NavigationMenuContentProps;
export type NavigationMenuTriggerProps = Primitive.NavigationMenuTriggerProps;

export const NavigationMenu = Primitive.Root;

export const NavigationMenuList = Primitive.List;

export function NavigationMenuItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.NavigationMenuItem>) {
  return (
    <Primitive.NavigationMenuItem className={cn('list-none', className)} {...props}>
      {children}
    </Primitive.NavigationMenuItem>
  );
}

export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger className={cn('data-[state=open]:bg-fd-accent/50', className)} {...props}>
      {children}
    </Primitive.Trigger>
  );
}

export function NavigationMenuContent({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={cn(
        'absolute inset-x-0 top-0 overflow-auto fd-scroll-container max-h-[80svh] data-[motion=from-end]:animate-fd-enterFromRight data-[motion=from-start]:animate-fd-enterFromLeft data-[motion=to-end]:animate-fd-exitToRight data-[motion=to-start]:animate-fd-exitToLeft',
        className,
      )}
      {...props}
    />
  );
}

export const NavigationMenuLink = Primitive.Link;

export function NavigationMenuViewport({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Viewport>) {
  return (
    <div ref={ref} className="flex w-full justify-center">
      <Primitive.Viewport
        {...props}
        className={cn(
          'relative h-(--radix-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden transition-[width,height] duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in',
          className,
        )}
      />
    </div>
  );
}
