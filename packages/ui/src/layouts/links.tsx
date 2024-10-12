import Link from 'fumadocs-core/link';
import { usePathname } from 'next/navigation';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
import { buttonVariants } from '@/components/ui/button';

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

export interface MainItem extends BaseLinkItem {
  type?: 'main';
  icon?: ReactNode;
  text: ReactNode;
  description?: ReactNode;
}

export interface IconItem extends BaseLinkItem {
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

export interface MenuItem extends BaseItem {
  type: 'menu';
  icon?: ReactNode;
  text: ReactNode;

  url?: string;
  items: (
    | (MainItem & {
        /**
         * Options when displayed on navigation menu
         */
        menu?: HTMLAttributes<HTMLElement> & {
          banner?: ReactNode;
          footer?: ReactNode;
        };
      })
    | CustomItem
  )[];

  banner?: ReactNode;

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

export const BaseLinkItem = forwardRef<
  HTMLAnchorElement,
  { item: BaseLinkItem } & HTMLAttributes<HTMLAnchorElement>
>(({ item, ...props }, ref) => {
  const pathname = usePathname();
  const activeType = item.active ?? 'url';
  const active =
    activeType !== 'none' &&
    isActive(item.url, pathname, activeType === 'nested-url');

  return (
    <Link
      ref={ref}
      href={item.url}
      external={item.external}
      {...props}
      data-active={active}
    >
      {props.children}
    </Link>
  );
});

BaseLinkItem.displayName = 'BaseLinkItem';

export const ButtonItem = forwardRef<
  HTMLAnchorElement,
  { item: ButtonItem } & HTMLAttributes<HTMLAnchorElement>
>(({ item, ...props }, ref) => {
  return (
    <Link
      ref={ref}
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
});

ButtonItem.displayName = 'ButtonItem';

export const IconItem = forwardRef<
  HTMLAnchorElement,
  { item: IconItem } & HTMLAttributes<HTMLAnchorElement>
>(({ item, ...props }, ref) => {
  return (
    <Link
      ref={ref}
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
});

IconItem.displayName = 'IconItem';
