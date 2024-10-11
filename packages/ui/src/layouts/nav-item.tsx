import { Fragment, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import Link from 'fumadocs-core/link';
import { ChevronDown } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { itemVariants } from '@/components/layout/variants';

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  key?: string | number;
  item: LinkItemType;
}

const navItemVariants = cva(
  'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:!text-fd-primary [&_svg]:size-4',
);

export function renderNavItem({
  key,
  item,
  ...props
}: LinkItemProps): ReactNode {
  if (item.type === 'custom')
    return (
      <div key={key} {...props}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <NavigationMenuItem key={key} {...props}>
        <NavigationMenuTrigger className={cn(navItemVariants())}>
          {item.url ? <Link href={item.url}>{item.text}</Link> : item.text}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-2 lg:grid-cols-3">
          <MenuItemContent item={item} />
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  if (item.type === 'button') {
    return (
      <NavigationMenuItem key={key} {...props}>
        <NavigationMenuLink asChild>
          <ButtonItem item={item} />
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  if (item.type === 'icon') {
    return (
      <NavigationMenuItem key={key} {...props}>
        <NavigationMenuLink asChild>
          <IconItem item={item} />
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={key} {...props}>
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
      {item.banner ? (
        <div className="row-span-3 overflow-hidden rounded-xl border-fd-foreground/10 bg-fd-muted">
          {item.banner}
        </div>
      ) : null}
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
                'block rounded-lg border bg-fd-muted/50 p-3 text-sm transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
                menuProps.className,
              )}
            >
              {banner}
              {child.icon ? (
                <div className="mb-1 w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4">
                  {child.icon}
                </div>
              ) : null}
              <p className="font-medium">{child.text}</p>
              {child.description ? (
                <p className="text-fd-muted-foreground">{child.description}</p>
              ) : null}
              {footer}
            </Link>
          </NavigationMenuLink>
        );
      })}
    </>
  );
}

export function renderMenuItem({
  key,
  item,
  ...rest
}: LinkItemProps): ReactNode {
  if (item.type === 'button') {
    return (
      <NavigationMenuLink key={key} asChild>
        <ButtonItem item={item} {...rest} />
      </NavigationMenuLink>
    );
  }

  if (item.type === 'custom')
    return (
      <div key={key} {...rest} className={cn('grid', rest.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <Collapsible
        key={key}
        {...rest}
        className={cn('flex flex-col', rest.className)}
      >
        <CollapsibleTrigger className={cn(itemVariants(), 'group/link')}>
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
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]/link:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ms-2 flex flex-col border-s py-2 ps-2">
            {item.items.map((child, i) =>
              renderMenuItem({ key: i, item: child }),
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <NavigationMenuLink key={key} asChild>
      <BaseLinkItem
        item={item}
        {...rest}
        className={cn(itemVariants(), rest.className)}
      >
        {item.icon}
        {item.text}
      </BaseLinkItem>
    </NavigationMenuLink>
  );
}
