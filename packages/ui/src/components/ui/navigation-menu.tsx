import * as React from 'react';
import * as Primitive from '@radix-ui/react-navigation-menu';
import { cn } from '@/utils/cn';

const NavigationMenu = Primitive.Root;

const NavigationMenuList = Primitive.List;

const NavigationMenuItem = Primitive.Item;

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof Primitive.Trigger>,
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
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, ...props }, ref) => (
  <Primitive.Content
    ref={ref}
    className={cn(
      'sm:absolute sm:inset-x-0 sm:top-0 sm:data-[motion=from-end]:animate-fd-enterFromRight sm:data-[motion=from-start]:animate-fd-enterFromLeft sm:data-[motion=to-end]:animate-fd-exitToRight sm:data-[motion=to-start]:animate-fd-exitToLeft',
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = Primitive.Content.displayName;

const NavigationMenuLink = Primitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof Primitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof Primitive.Viewport>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="flex w-full justify-center">
    <Primitive.Viewport
      {...props}
      className={cn(
        'relative h-fit w-full origin-[top_center] overflow-hidden text-fd-popover-foreground duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in sm:h-[var(--radix-navigation-menu-viewport-height)] sm:transition-[width,height]',
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
