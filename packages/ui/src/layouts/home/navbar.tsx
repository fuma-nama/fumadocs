'use client';
import { type ComponentProps, useState } from 'react';
import { type VariantProps } from 'cvb';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { cn, cvb } from '@/utils/cn';
import { BaseLinkItem } from '@/layouts/links';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu';
import { useNav } from '@/contexts/layout';
import type {
  NavigationMenuContentProps,
  NavigationMenuTriggerProps,
} from '@radix-ui/react-navigation-menu';
import { buttonVariants } from '@/components/ui/button';

const navItemVariants = cvb({
  base: 'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4',
});

export function Navbar(props: ComponentProps<'div'>) {
  const [value, setValue] = useState('');
  const { isTransparent } = useNav();

  return (
    <NavigationMenu value={value} onValueChange={setValue} asChild>
      <header
        id="nd-nav"
        {...props}
        className={cn(
          'fixed top-(--fd-banner-height) z-40 box-content backdrop-blur-lg max-w-fd-container -translate-x-1/2 border-b transition-colors lg:mt-2 lg:[--fd-padding:1rem] lg:rounded-2xl lg:border',
          value.length > 0 ? 'shadow-lg' : 'shadow-sm',
          (!isTransparent || value.length > 0) && 'bg-fd-background/80',
          props.className,
        )}
        style={
          {
            width:
              'calc(100% - var(--fd-padding,0px) - var(--removed-body-scroll-bar-size,0px))',
            left: 'calc(50% - var(--removed-body-scroll-bar-size,0px) / 2)',
            ...props.style,
          } as object
        }
      >
        <NavigationMenuList
          className="flex h-14 w-full items-center px-4 lg:h-12"
          asChild
        >
          <nav>{props.children}</nav>
        </NavigationMenuList>
        <NavigationMenuViewport className="text-fd-popover-foreground" />
      </header>
    </NavigationMenu>
  );
}

export const NavbarMenu = NavigationMenuItem;

export function NavbarMenuContent(props: NavigationMenuContentProps) {
  return (
    <NavigationMenuContent
      {...props}
      className={cn(
        'grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3',
        props.className,
      )}
    >
      {props.children}
    </NavigationMenuContent>
  );
}

export function NavbarMenuTrigger(props: NavigationMenuTriggerProps) {
  return (
    <NavigationMenuTrigger
      {...props}
      className={cn(navItemVariants(), 'rounded-md', props.className)}
    >
      {props.children}
    </NavigationMenuTrigger>
  );
}

export function NavbarMenuLink(props: LinkProps) {
  return (
    <NavigationMenuLink asChild>
      <Link
        {...props}
        className={cn(
          'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
          props.className,
        )}
      >
        {props.children}
      </Link>
    </NavigationMenuLink>
  );
}

const linkVariants = cvb({
  variants: {
    variant: {
      main: navItemVariants(),
      button: buttonVariants({
        color: 'secondary',
        className: 'gap-1.5 [&_svg]:size-4',
      }),
      icon: buttonVariants({
        color: 'ghost',
        size: 'icon',
      }),
    },
  },
  defaultVariants: {
    variant: 'main',
  },
});

export function NavbarLink({
  item,
  variant,
  ...props
}: ComponentProps<typeof BaseLinkItem> & VariantProps<typeof linkVariants>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <BaseLinkItem
          {...props}
          item={item}
          className={linkVariants({ variant, className: props.className })}
        >
          {props.children}
        </BaseLinkItem>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
