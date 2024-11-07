'use client';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import { cn } from '@/utils/cn';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import Link from 'fumadocs-core/link';
import { cva } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';

const menuItemVariants = cva('', {
  variants: {
    variant: {
      main: 'inline-flex items-center gap-2 py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary [&_svg]:size-4',
      icon: buttonVariants({
        size: 'icon',
        color: 'ghost',
      }),
      button: buttonVariants({
        color: 'secondary',
        className: 'gap-1.5 [&_svg]:size-4',
      }),
    },
  },
  defaultVariants: {
    variant: 'main',
  },
});

export function MenuLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom')
    return <div className={cn('grid', props.className)}>{item.children}</div>;

  if (item.type === 'menu')
    return (
      <div className={cn('mb-4 flex flex-col', props.className)}>
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
          <MenuLinkItem key={i} item={child} />
        ))}
      </div>
    );

  return (
    <NavigationMenuLink asChild>
      <BaseLinkItem
        item={item}
        className={cn(
          menuItemVariants({ variant: item.type }),
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
