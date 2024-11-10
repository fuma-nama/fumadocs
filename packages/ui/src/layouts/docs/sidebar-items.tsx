'use client';
import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, useMemo } from 'react';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
} from '@/layouts/docs/sidebar';
import type { SidebarComponents } from '@/layouts/docs/shared';

function PageTreeFolder({
  item,
  children,
  level,
}: {
  item: PageTree.Folder;
  level: number;
  children: ReactNode;
}) {
  const path = useTreePath();

  return (
    <SidebarFolder
      defaultOpen={item.defaultOpen || path.includes(item)}
      level={level + 1}
    >
      {item.index ? (
        <SidebarFolderLink href={item.index.url} external={item.index.external}>
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent>{children}</SidebarFolderContent>
    </SidebarFolder>
  );
}

function renderSidebarList(
  items: PageTree.Node[],
  level: number,
  customComps: Partial<SidebarComponents>,
): ReactNode[] {
  const { Separator, Item, Folder } = customComps;

  return items.map((item, i) => {
    const id = `${item.type}_${i.toString()}`;

    switch (item.type) {
      case 'separator':
        return Separator ? (
          <Separator key={id} item={item} />
        ) : (
          <SidebarSeparator key={id}>{item.name}</SidebarSeparator>
        );
      case 'folder':
        return Folder ? (
          <Folder key={id} item={item} level={level + 1} />
        ) : (
          <PageTreeFolder key={id} item={item} level={level + 1}>
            {renderSidebarList(item.children, level + 1, customComps)}
          </PageTreeFolder>
        );
      default:
        return Item ? (
          <Item key={item.url} item={item} />
        ) : (
          <SidebarItem
            key={item.url}
            href={item.url}
            external={item.external}
            icon={item.icon}
          >
            {item.name}
          </SidebarItem>
        );
    }
  });
}

/**
 * Render sidebar items from page tree
 */
export function SidebarItems(props: {
  components?: Partial<SidebarComponents>;
}) {
  const { root } = useTreeContext();

  return useMemo(
    () => renderSidebarList(root.children, 1, props.components ?? {}),
    [root, props.components],
  );
}
