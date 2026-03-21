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
import { navItemVariants } from './slots/header';

export const NavbarMenu = NavigationMenuItem;

export function NavbarMenuContent(props: NavigationMenuContentProps) {
  const { className, ...rest } = props;
  return (
    <NavigationMenuContent
      {...rest}
      className={(state) =>
        cn(
          'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3',
          typeof className === 'function' ? className(state) : className,
        )
      }
    >
      {props.children}
    </NavigationMenuContent>
  );
}

export function NavbarMenuTrigger(props: NavigationMenuTriggerProps) {
  const { className, ...rest } = props;
  return (
    <NavigationMenuTrigger
      {...rest}
      className={(state) =>
        cn(
          navItemVariants(),
          'text-sm rounded-md',
          typeof className === 'function' ? className(state) : className,
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
