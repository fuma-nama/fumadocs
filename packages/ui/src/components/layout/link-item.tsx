import Link from 'fumadocs-core/link';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cva } from 'class-variance-authority';
import { type HTMLAttributes, type ReactNode, useState } from 'react';
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

const navItemVariants = cva(
  '-m-2 inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:!text-fd-primary [&_svg]:size-4',
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

interface MainItem extends BaseLinkItem {
  type?: 'main';
  icon?: ReactNode;
  text: ReactNode;
}

interface IconItem extends BaseLinkItem {
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
}

interface ButtonItem extends BaseLinkItem {
  type: 'button';
  icon?: ReactNode;
  text: ReactNode;
  /**
   * @defaultValue false
   */
  secondary?: boolean;
}

interface MenuItem extends BaseItem {
  type: 'menu';
  icon?: ReactNode;
  text: ReactNode;
  items: LinkItemType[];
  /**
   * @defaultValue false
   */
  secondary?: boolean;
}

interface CustomItem extends BaseItem {
  type: 'custom';
  /**
   * @defaultValue false
   */
  secondary?: boolean;
  children: ReactNode;
}

export type LinkItemType =
  | MainItem
  | IconItem
  | ButtonItem
  | MenuItem
  | CustomItem;

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  key?: string | number;
  item: LinkItemType;
}

export function renderMenuItem({
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
      <Collapsible key={key} className="flex flex-col">
        <CollapsibleTrigger
          {...props}
          className={cn(itemVariants(), props.className, 'group/link')}
        >
          {item.icon}
          {item.text}
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

  if (item.type === 'button') {
    return <ButtonItem key={key} item={item} {...props} />;
  }

  return (
    <BaseLinkItem
      key={key}
      item={item}
      {...props}
      className={cn(itemVariants(), props.className)}
    >
      {item.icon}
      {item.text}
    </BaseLinkItem>
  );
}

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
      <LinksMenu
        key={key}
        items={item.items.map((child, i) =>
          renderMenuItem({ key: i, item: child }),
        )}
        {...props}
        className={cn(navItemVariants(), props.className)}
      >
        {item.text}
        <ChevronDown className="ms-auto !size-3.5" />
      </LinksMenu>
    );
  }

  if (item.type === 'button') {
    return <ButtonItem key={key} item={item} {...props} />;
  }

  if (item.type === 'icon') {
    return <IconItem key={key} item={item} {...props} />;
  }

  return (
    <BaseLinkItem
      key={key}
      item={item}
      {...props}
      className={cn(navItemVariants(), props.className)}
    >
      {item.text}
    </BaseLinkItem>
  );
}

function BaseLinkItem({
  item,
  ...props
}: { item: BaseLinkItem } & HTMLAttributes<HTMLAnchorElement>): ReactNode {
  const pathname = usePathname();
  const activeType = item.active ?? 'url';
  const active =
    activeType !== 'none' &&
    isActive(item.url, pathname, activeType === 'nested-url');

  return (
    <Link
      href={item.url}
      external={item.external}
      data-active={active}
      {...props}
    >
      {props.children}
    </Link>
  );
}

export function IconItem({
  item,
  ...props
}: { item: IconItem } & HTMLAttributes<HTMLAnchorElement>): ReactNode {
  return (
    <Link
      aria-label={item.label}
      href={item.url}
      external={item.external}
      {...props}
      className={cn(
        buttonVariants({
          size: 'icon',
          color: 'ghost',
        }),
        props.className,
      )}
    >
      {item.icon}
    </Link>
  );
}

function ButtonItem({
  item,
  ...props
}: { item: ButtonItem } & HTMLAttributes<HTMLAnchorElement>): ReactNode {
  return (
    <Link
      href={item.url}
      external={item.external}
      {...props}
      className={cn(
        buttonVariants({ color: 'secondary' }),
        'gap-1.5 [&_svg]:size-4',
        props.className,
      )}
    >
      {item.icon}
      {item.text}
    </Link>
  );
}

interface LinksMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items?: ReactNode;
}

export function LinksMenu({ items, ...props }: LinksMenuProps): ReactNode {
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
