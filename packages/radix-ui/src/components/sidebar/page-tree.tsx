import { useTreeContext, useTreePath } from '@/contexts/tree';
import { type FC, type ReactNode, useMemo, Fragment } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import type * as Base from './base';

export interface SidebarPageTreeComponents {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; children: ReactNode }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

type InternalComponents = Pick<
  typeof Base,
  | 'SidebarSeparator'
  | 'SidebarFolder'
  | 'SidebarFolderLink'
  | 'SidebarFolderContent'
  | 'SidebarFolderTrigger'
  | 'SidebarItem'
>;

export function createPageTreeRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarSeparator,
  SidebarItem,
}: InternalComponents) {
  function PageTreeFolder({ item, children }: { item: PageTree.Folder; children: ReactNode }) {
    const path = useTreePath();

    return (
      <SidebarFolder
        collapsible={item.collapsible}
        active={path.includes(item)}
        defaultOpen={item.defaultOpen}
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

  /**
   * Render sidebar items from page tree
   */
  return function SidebarPageTree(components: Partial<SidebarPageTreeComponents>) {
    const { root } = useTreeContext();
    const { Separator, Item, Folder = PageTreeFolder } = components;

    return useMemo(() => {
      function renderSidebarList(items: PageTree.Node[]) {
        return items.map((item, i) => {
          if (item.type === 'separator') {
            if (Separator) return <Separator key={i} item={item} />;
            return (
              <SidebarSeparator key={i}>
                {item.icon}
                {item.name}
              </SidebarSeparator>
            );
          }

          if (item.type === 'folder') {
            return (
              <Folder key={i} item={item}>
                {renderSidebarList(item.children)}
              </Folder>
            );
          }

          if (Item) return <Item key={item.url} item={item} />;
          return (
            <SidebarItem key={item.url} href={item.url} external={item.external} icon={item.icon}>
              {item.name}
            </SidebarItem>
          );
        });
      }

      return <Fragment key={root.$id}>{renderSidebarList(root.children)}</Fragment>;
    }, [Folder, Item, Separator, root]);
  };
}
