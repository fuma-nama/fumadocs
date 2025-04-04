import type { LinkItemType } from '@/layouts/links';
import {
  type SidebarComponents,
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  type SidebarProps,
} from '@/components/layout/sidebar';
import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode } from 'react';
import type { Option } from '@/components/layout/root-toggle';
import {
  getSidebarTabs,
  type GetSidebarTabsOptions,
} from '@/utils/get-sidebar-tabs';

export const layoutVariables = {
  '--fd-layout-offset': 'max(calc(50vw - var(--fd-layout-width) / 2), 0px)',
};

export interface SidebarOptions extends SidebarProps {
  collapsible?: boolean;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Hide search trigger. You can also disable search for the entire site from `<RootProvider />`.
   *
   * @defaultValue false
   */
  hideSearch?: boolean;
}

export function SidebarLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'menu')
    return (
      <SidebarFolder {...props}>
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

  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  return (
    <SidebarItem
      href={item.url}
      icon={item.icon}
      external={item.external}
      {...props}
    >
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
