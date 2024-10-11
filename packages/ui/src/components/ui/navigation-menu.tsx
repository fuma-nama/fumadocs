import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const NavigationMenu = NavigationMenuPrimitive.Root;

const NavigationMenuList = NavigationMenuPrimitive.List;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn('group data-[state=open]:bg-fd-accent/50', className)}
    {...props}
  >
    {children}
    <ChevronDown
      className="size-3 transition-transform duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      'sm:absolute sm:inset-x-0 sm:top-0 sm:data-[motion=from-end]:animate-fd-enterFromRight sm:data-[motion=from-start]:animate-fd-enterFromLeft sm:data-[motion=to-end]:animate-fd-exitToRight sm:data-[motion=to-start]:animate-fd-exitToLeft',
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="flex w-full justify-center">
    <NavigationMenuPrimitive.Viewport
      {...props}
      className={cn(
        'relative h-fit w-full origin-[top_center] overflow-hidden text-fd-popover-foreground duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in sm:h-[var(--radix-navigation-menu-viewport-height)] sm:transition-[width,height]',
        className,
      )}
    />
  </div>
));
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
};
