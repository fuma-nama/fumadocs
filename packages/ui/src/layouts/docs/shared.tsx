import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  type SidebarProps,
} from '@/layouts/docs/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { PageTree } from 'fumadocs-core/server';
import { getSidebarTabs, type TabOptions } from '@/utils/get-sidebar-tabs';
import type { FC, ReactNode } from 'react';
import type { Option } from '@/components/layout/root-toggle';

export interface SidebarOptions extends SidebarProps {
  enabled: boolean;
  component: ReactNode;

  collapsible?: boolean;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | TabOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Hide search trigger
   *
   * @defaultValue false
   */
  hideSearch?: boolean;
}

export interface SidebarComponents {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

export function SidebarLinkItem({ item }: { item: LinkItemType }) {
  if (item.type === 'menu')
    return (
      <SidebarFolder>
        {item.url ? (
          <SidebarFolderLink href={item.url}>
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

  if (item.type === 'button') {
    return (
      <BaseLinkItem
        item={item}
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'gap-1.5 [&_svg]:size-4',
          }),
        )}
      >
        {item.icon}
        {item.text}
      </BaseLinkItem>
    );
  }

  if (item.type === 'custom') return item.children;

  return (
    <SidebarItem href={item.url} icon={item.icon} external={item.external}>
      {item.text}
    </SidebarItem>
  );
}

export function getSidebarTabsFromOptions(
  options: SidebarOptions['tabs'],
  tree: PageTree.Root,
) {
  if (Array.isArray(options)) {
    return options;
  } else if (typeof options === 'object') {
    return getSidebarTabs(tree, options);
  } else if (options !== false) {
    return getSidebarTabs(tree);
  }
}
