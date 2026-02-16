'use client';
import type { HTMLAttributes } from 'react';
import type * as Base from './base';
import { useLinkItemActive, type LinkItemType } from '@/utils/link-item';

type InternalComponents = Pick<
  typeof Base,
  | 'SidebarFolder'
  | 'SidebarFolderLink'
  | 'SidebarFolderContent'
  | 'SidebarFolderTrigger'
  | 'SidebarItem'
>;

export function createLinkItemRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
}: InternalComponents) {
  /**
   * Render sidebar items from page tree
   */
  return function SidebarLinkItem({
    item,
    ...props
  }: HTMLAttributes<HTMLElement> & {
    item: Exclude<LinkItemType, { type: 'icon' }>;
  }) {
    const active = useLinkItemActive(item);
    if (item.type === 'custom') return <div {...props}>{item.children}</div>;

    if (item.type === 'menu')
      return (
        <SidebarFolder {...props}>
          {item.url ? (
            <SidebarFolderLink href={item.url} active={active} external={item.external}>
              {item.icon}
              {item.text}
            </SidebarFolderLink>
          ) : (
            <SidebarFolderTrigger>
              {item.icon}
              {item.text}
            </SidebarFolderTrigger>
          )}
          <SidebarFolderContent>
            {item.items.map((child, i) => (
              <SidebarLinkItem key={i} item={child} />
            ))}
          </SidebarFolderContent>
        </SidebarFolder>
      );

    return (
      <SidebarItem
        href={item.url}
        icon={item.icon}
        external={item.external}
        active={active}
        {...props}
      >
        {item.text}
      </SidebarItem>
    );
  };
}
