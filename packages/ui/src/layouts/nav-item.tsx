import { Fragment, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import {
  BaseLinkItem,
  ButtonItem,
  IconItem,
  type LinkItemType,
  type MenuItem,
} from '@/layouts/links';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  item: LinkItemType;
}

const navItemVariants = cva(
  'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4',
);

export function NavItem({ item, ...props }: LinkItemProps): ReactNode {
  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  if (item.type === 'menu') {
    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuTrigger className={cn(navItemVariants(), 'rounded-md')}>
          {item.url ? <Link href={item.url}>{item.text}</Link> : item.text}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-2 lg:grid-cols-3">
          <MenuItemContent item={item} />
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  if (item.type === 'button') {
    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuLink asChild>
          <ButtonItem item={item} />
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  if (item.type === 'icon') {
    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuLink asChild>
          <IconItem item={item} />
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem {...props}>
      <NavigationMenuLink asChild>
        <BaseLinkItem item={item} className={cn(navItemVariants())}>
          {item.text}
        </BaseLinkItem>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function MenuItemContent({ item }: { item: MenuItem }): ReactNode {
  return (
    <>
      {item.items.map((child, i) => {
        if (child.type === 'custom')
          return <Fragment key={i}>{child.children}</Fragment>;

        const { banner, footer, ...menuProps } = child.menu ?? {};

        return (
          <NavigationMenuLink key={i} asChild>
            <Link
              external={child.external}
              href={child.url}
              {...menuProps}
              className={cn(
                'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
                menuProps.className,
              )}
            >
              {banner ??
                (child.icon ? (
                  <div className="w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4">
                    {child.icon}
                  </div>
                ) : null)}
              <p className="-mb-1 text-sm font-medium">{child.text}</p>
              {child.description ? (
                <p className="text-[13px] text-fd-muted-foreground">
                  {child.description}
                </p>
              ) : null}
              {footer}
            </Link>
          </NavigationMenuLink>
        );
      })}
    </>
  );
}

export function MenuItem({ item, ...rest }: LinkItemProps): ReactNode {
  if (item.type === 'button') {
    return (
      <NavigationMenuLink asChild>
        <ButtonItem item={item} {...rest} />
      </NavigationMenuLink>
    );
  }

  if (item.type === 'custom')
    return (
      <div {...rest} className={cn('grid', rest.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <div {...rest} className={cn('mb-4 flex flex-col', rest.className)}>
        <p className="mb-1 text-sm text-fd-muted-foreground">
          {item.url ? (
            <NavigationMenuLink asChild>
              <Link href={item.url}>
                {item.icon}
                {item.text}
              </Link>
            </NavigationMenuLink>
          ) : (
            <>
              {item.icon}
              {item.text}
            </>
          )}
        </p>
        {item.items.map((child, i) => (
          <MenuItem key={i} item={child} />
        ))}
      </div>
    );
  }

  if (item.type === 'icon') {
    return (
      <NavigationMenuLink asChild>
        <IconItem item={item} />
      </NavigationMenuLink>
    );
  }

  return (
    <NavigationMenuLink asChild>
      <BaseLinkItem
        item={item}
        {...rest}
        className={cn(
          'inline-flex items-center gap-2 py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary [&_svg]:size-4',
          rest.className,
        )}
      >
        {item.icon}
        {item.text}
      </BaseLinkItem>
    </NavigationMenuLink>
  );
}
