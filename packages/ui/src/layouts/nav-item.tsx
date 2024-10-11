import { Fragment, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import {
  BaseLinkItem,
  ButtonItem,
  IconItem,
  type LinkItemType,
} from '@/components/layout/link-item';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

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
      <div key={key} {...props} className={cn('grid', props.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <NavigationMenuItem key={key}>
        <NavigationMenuTrigger
          {...props}
          className={cn(navItemVariants(), props.className)}
        >
          {item.url ? <Link href={item.url}>{item.text}</Link> : item.text}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-2 lg:grid-cols-3">
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
                    <p className="text-fd-muted-foreground">
                      {child.description}
                    </p>
                  ) : null}
                  {footer}
                </Link>
              </NavigationMenuLink>
            );
          })}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  if (item.type === 'button') {
    return <ButtonItem key={key} item={item} {...props} />;
  }

  if (item.type === 'icon') {
    return <IconItem key={key} item={item} {...props} />;
  }

  return (
    <NavigationMenuItem key={key}>
      <NavigationMenuLink asChild>
        <BaseLinkItem
          item={item}
          {...props}
          className={cn(navItemVariants(), props.className)}
        >
          {item.text}
        </BaseLinkItem>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
