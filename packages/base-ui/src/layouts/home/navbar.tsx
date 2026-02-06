'use client';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import {
  NavigationMenuContent,
  type NavigationMenuContentProps,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  type NavigationMenuTriggerProps,
} from '@/components/ui/navigation-menu';
import { navItemVariants } from './client';

export const NavbarMenu = NavigationMenuItem;

export function NavbarMenuContent({ className, ...props }: NavigationMenuContentProps) {
  return (
    <NavigationMenuContent
      className={(s) =>
        cn(
          'grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    >
      {props.children}
    </NavigationMenuContent>
  );
}

export function NavbarMenuTrigger({ className, ...props }: NavigationMenuTriggerProps) {
  return (
    <NavigationMenuTrigger
      {...props}
      className={(s) =>
        cn(
          navItemVariants(),
          'rounded-md',
          typeof className === 'function' ? className(s) : className,
        )
      }
    >
      {props.children}
    </NavigationMenuTrigger>
  );
}

export function NavbarMenuLink(props: LinkProps) {
  return (
    <NavigationMenuLink
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
