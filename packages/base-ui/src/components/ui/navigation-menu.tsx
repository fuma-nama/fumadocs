'use client';
import * as React from 'react';
import { NavigationMenu as Primitive } from '@base-ui/react/navigation-menu';
import { cn } from '@fumadocs/ui-utils/utils/cn';

export type NavigationMenuContentProps = Primitive.Content.Props;
export type NavigationMenuTriggerProps = Primitive.Trigger.Props;

const NavigationMenu = Primitive.Root;

const NavigationMenuList = Primitive.List;

const NavigationMenuItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ className, children, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={(s) =>
      cn(
        'list-none',
        typeof className === 'function' ? className(s) : className,
      )
    }
    {...props}
  >
    {children}
  </Primitive.Item>
));

NavigationMenuItem.displayName = Primitive.Item.displayName;

const NavigationMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={(s) =>
      cn(
        'data-[state=open]:bg-fd-accent/50',
        typeof className === 'function' ? className(s) : className,
      )
    }
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
    className={(s) =>
      cn(
        'absolute inset-x-0 top-0 overflow-auto fd-scroll-container max-h-[80svh] data-[motion=from-end]:animate-fd-enterFromRight data-[motion=from-start]:animate-fd-enterFromLeft data-[motion=to-end]:animate-fd-exitToRight data-[motion=to-start]:animate-fd-exitToLeft',
        typeof className === 'function' ? className(s) : className,
      )
    }
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
      className={(s) =>
        cn(
          'relative h-(--radix-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden transition-[width,height] duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in',
          typeof className === 'function' ? className(s) : className,
        )
      }
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
