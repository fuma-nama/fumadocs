'use client';
import { type ComponentProps, Fragment, useState } from 'react';
import { cva } from 'class-variance-authority';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import { BaseLinkItem, LinkItemType } from '@/layouts/shared';
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
import { buttonVariants } from '@/components/ui/button';

export const navItemVariants = cva('[&_svg]:size-4', {
  variants: {
    variant: {
      main: 'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary',
      button: buttonVariants({
        color: 'secondary',
        className: 'gap-1.5',
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

export function Navbar(props: ComponentProps<'div'>) {
  const [value, setValue] = useState('');
  const { isTransparent } = useNav();

  return (
    <NavigationMenu value={value} onValueChange={setValue} asChild>
      <header
        id="nd-nav"
        {...props}
        className={cn(
          'fixed top-(--fd-banner-height) z-40 left-0 right-(--removed-body-scroll-bar-size,0) backdrop-blur-lg border-b transition-colors *:mx-auto *:max-w-fd-container',
          value.length > 0 && 'max-lg:shadow-lg max-lg:rounded-b-2xl',
          (!isTransparent || value.length > 0) && 'bg-fd-background/80',
          props.className,
        )}
      >
        <NavigationMenuList
          className="flex h-14 w-full items-center px-4"
          asChild
        >
          <nav>{props.children}</nav>
        </NavigationMenuList>

        <NavigationMenuViewport />
      </header>
    </NavigationMenu>
  );
}

export { NavigationMenuItem };

export function NavigationMenuLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  if (item.type === 'menu') {
    const children = item.items.map((child, j) => {
      if (child.type === 'custom') {
        return <Fragment key={j}>{child.children}</Fragment>;
      }

      const {
        banner = child.icon ? (
          <div className="w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4">
            {child.icon}
          </div>
        ) : null,
        ...rest
      } = child.menu ?? {};

      return (
        <NavigationMenuLink key={`${j}-${child.url}`} asChild>
          <Link
            href={child.url}
            external={child.external}
            {...rest}
            className={cn(
              'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
              rest.className,
            )}
          >
            {rest.children ?? (
              <>
                {banner}
                <p className="text-[15px] font-medium">{child.text}</p>
                <p className="text-sm text-fd-muted-foreground empty:hidden">
                  {child.description}
                </p>
              </>
            )}
          </Link>
        </NavigationMenuLink>
      );
    });

    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuTrigger className={cn(navItemVariants(), 'rounded-md')}>
          {item.url ? (
            <Link href={item.url} external={item.external}>
              {item.text}
            </Link>
          ) : (
            item.text
          )}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3">
          {children}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem {...props}>
      <NavigationMenuLink asChild>
        <BaseLinkItem
          item={item}
          aria-label={item.type === 'icon' ? item.label : undefined}
          className={cn(navItemVariants({ variant: item.type }))}
        >
          {item.type === 'icon' ? item.icon : item.text}
        </BaseLinkItem>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

export function MobileNavigationMenuLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom')
    return <div className={cn('grid', props.className)}>{item.children}</div>;

  if (item.type === 'menu') {
    const header = (
      <>
        {item.icon}
        {item.text}
      </>
    );

    return (
      <div className={cn('mb-4 flex flex-col', props.className)}>
        <p className="mb-1 text-sm text-fd-muted-foreground">
          {item.url ? (
            <NavigationMenuLink asChild>
              <Link href={item.url} external={item.external}>
                {header}
              </Link>
            </NavigationMenuLink>
          ) : (
            header
          )}
        </p>
        {item.items.map((child, i) => (
          <MobileNavigationMenuLinkItem key={i} item={child} />
        ))}
      </div>
    );
  }

  return (
    <NavigationMenuLink asChild>
      <BaseLinkItem
        item={item}
        className={cn(
          {
            main: 'inline-flex items-center gap-2 py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary [&_svg]:size-4',
            icon: buttonVariants({
              size: 'icon',
              color: 'ghost',
            }),
            button: buttonVariants({
              color: 'secondary',
              className: 'gap-1.5 [&_svg]:size-4',
            }),
          }[item.type ?? 'main'],
          props.className,
        )}
        aria-label={item.type === 'icon' ? item.label : undefined}
      >
        {item.icon}
        {item.type === 'icon' ? undefined : item.text}
      </BaseLinkItem>
    </NavigationMenuLink>
  );
}

export function MobileNavigationMenuTrigger({
  enableHover = false,
  ...props
}: ComponentProps<typeof NavigationMenuTrigger> & {
  /**
   * Enable hover to trigger
   */
  enableHover?: boolean;
}) {
  return (
    <NavigationMenuTrigger
      {...props}
      onPointerMove={enableHover ? undefined : (e) => e.preventDefault()}
    >
      {props.children}
    </NavigationMenuTrigger>
  );
}

export function MobileNavigationMenuContent(
  props: ComponentProps<typeof NavigationMenuContent>,
) {
  return (
    <NavigationMenuContent
      {...props}
      className={cn('flex flex-col p-4', props.className)}
    >
      {props.children}
    </NavigationMenuContent>
  );
}
