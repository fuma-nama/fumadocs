'use client';
import * as React from 'react';
import * as Primitive from '@radix-ui/react-navigation-menu';
import { cn } from '@/utils/cn';

const NavigationMenu = Primitive.Root;

const NavigationMenuList = Primitive.List;

const NavigationMenuItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.NavigationMenuItem>,
  React.ComponentPropsWithoutRef<typeof Primitive.NavigationMenuItem>
>(({ className, children, ...props }, ref) => (
  <Primitive.NavigationMenuItem
    ref={ref}
    className={cn('list-none', className)}
    {...props}
  >
    {children}
  </Primitive.NavigationMenuItem>
));

NavigationMenuItem.displayName = Primitive.NavigationMenuItem.displayName;

const NavigationMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={cn('data-[state=open]:bg-fd-accent/50', className)}
    {...props}
  >
    {children}
  </Primitive.Trigger>
));
NavigationMenuTrigger.displayName = Primitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, ...props }, ref) => (
  <Primitive.Content
    ref={ref}
    className={cn(
      'absolute inset-x-0 top-0 data-[motion=from-end]:animate-fd-enterFromRight data-[motion=from-start]:animate-fd-enterFromLeft data-[motion=to-end]:animate-fd-exitToRight data-[motion=to-start]:animate-fd-exitToLeft',
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = Primitive.Content.displayName;

const NavigationMenuLink = Primitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ComponentRef<typeof Primitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof Primitive.Viewport>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="flex w-full justify-center">
    <Primitive.Viewport
      {...props}
      className={cn(
        'relative h-(--radix-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden text-fd-popover-foreground transition-[width,height] duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in',
        className,
      )}
    />
  </div>
));
NavigationMenuViewport.displayName = Primitive.Viewport.displayName;

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
};
