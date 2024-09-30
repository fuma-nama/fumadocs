import Link from 'fumadocs-core/link';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cva } from 'class-variance-authority';
import { type ReactNode, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
import { buttonVariants } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { itemVariants } from '@/components/layout/variants';

const linkItemVariants = cva(
  '-m-2 inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'text-fd-primary',
        false: 'hover:text-fd-accent-foreground',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

interface BaseItem {
  /**
   * Restrict where the item is displayed
   *
   * @defaultValue 'all'
   */
  on?: 'menu' | 'nav' | 'all';
}

interface BaseLinkItem extends BaseItem {
  url: string;
  /**
   * When the item is marked as active
   *
   * @defaultValue 'url'
   */
  active?: 'url' | 'nested-url' | 'none';
  external?: boolean;
}

export type LinkItemType =
  | (BaseLinkItem & {
      type?: 'main';
      icon?: ReactNode;
      text: ReactNode;
    })
  | (BaseLinkItem & {
      type: 'icon';
      /**
       * `aria-label` of icon button
       */
      label?: string;
      icon: ReactNode;
      text: ReactNode;
      /**
       * @defaultValue true
       */
      secondary?: boolean;
    })
  | (BaseLinkItem & {
      type: 'button';
      icon?: ReactNode;
      text: ReactNode;
      /**
       * @defaultValue false
       */
      secondary?: boolean;
    })
  | (BaseItem & {
      type: 'menu';
      icon?: ReactNode;
      text: ReactNode;
      items: LinkItemType[];
      /**
       * @defaultValue false
       */
      secondary?: boolean;
    })
  | (BaseItem & {
      type: 'custom';
      /**
       * @defaultValue false
       */
      secondary?: boolean;
      children: ReactNode;
    });

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  item: LinkItemType;
  on?: 'menu' | 'nav';
}

export function LinkItem({
  item,
  on = 'nav',
  className,
  ...props
}: LinkItemProps): React.ReactNode {
  const pathname = usePathname();

  if (item.on && item.on !== 'all' && item.on !== on) return null;

  if (item.type === 'custom')
    return <div className={cn('grid', className)}>{item.children}</div>;

  if (item.type === 'menu' && on === 'nav') {
    return (
      <LinksMenu
        items={item.items.map((child, i) => (
          <LinkItem key={i} item={child} on="menu" />
        ))}
        className={cn(linkItemVariants({ className }))}
        {...props}
      >
        {item.icon}
        {item.text}
        <ChevronDown className="ms-auto !size-3.5" />
      </LinksMenu>
    );
  }

  if (item.type === 'menu') {
    return (
      <Collapsible className="flex flex-col">
        <CollapsibleTrigger
          className={cn(itemVariants({ className }), 'group/link')}
          {...props}
        >
          {item.icon}
          {item.text}
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]/link:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ms-2 flex flex-col border-s py-2 ps-2">
            {item.items.map((child, i) => (
              <LinkItem key={i} item={child} on="menu" />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (item.type === 'button') {
    return (
      <Link
        href={item.url}
        external={item.external}
        className={cn(
          buttonVariants({ color: 'secondary' }),
          'gap-1.5 [&_svg]:size-4',
          className,
        )}
      >
        {item.icon}
        {item.text}
      </Link>
    );
  }

  const activeType = item.active ?? 'url';
  const active =
    activeType !== 'none' &&
    isActive(item.url, pathname, activeType === 'nested-url');

  if (item.type === 'icon' && on === 'nav') {
    return (
      <Link
        aria-label={item.label}
        href={item.url}
        external={item.external}
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className,
          }),
        )}
        {...props}
      >
        {item.icon}
      </Link>
    );
  }

  return (
    <Link
      href={item.url}
      external={item.external}
      className={cn(
        on === 'nav'
          ? linkItemVariants({
              active,
            })
          : itemVariants({ active }),
        className,
      )}
      {...props}
    >
      {on === 'menu' ? item.icon : null}
      {item.text}
    </Link>
  );
}

interface LinksMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items?: ReactNode;
}

export function LinksMenu({
  items,
  ...props
}: LinksMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useOnChange(pathname, () => {
    setOpen(false);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger {...props} />
      <PopoverContent className="flex flex-col p-1">{items}</PopoverContent>
    </Popover>
  );
}
