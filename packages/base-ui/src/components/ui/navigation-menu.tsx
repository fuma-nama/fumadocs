'use client';
import * as React from 'react';
import { NavigationMenu as Primitive } from '@base-ui/react/navigation-menu';
import { cn } from '@fumadocs/ui-utils/cn';

export type NavigationMenuContentProps = Primitive.Content.Props;
export type NavigationMenuTriggerProps = Primitive.Trigger.Props;

const NavigationMenuRoot = Primitive.Root;

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
        'data-[open]:bg-fd-accent/50',
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
        'w-[calc(100vw_-_40px)] h-full p-6 xs:w-max xs:min-w-[400px] xs:w-max',
        'transition-[opacity,transform,translate] duration-[var(--duration)] ease-[var(--easing)]',
        'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        'data-[starting-style]:data-[activation-direction=left]:translate-x-[-50%]',
        'data-[starting-style]:data-[activation-direction=right]:translate-x-[50%]',
        'data-[ending-style]:data-[activation-direction=left]:translate-x-[50%]',
        'data-[ending-style]:data-[activation-direction=right]:translate-x-[-50%]',
        typeof className === 'function' ? className(s) : className,
      )
    }
    {...props}
  />
));
NavigationMenuContent.displayName = Primitive.Content.displayName;

const NavigationMenuLink = Primitive.Link;

export {
  NavigationMenuRoot,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
};
