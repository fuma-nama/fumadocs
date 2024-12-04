import type { PageTree } from 'fumadocs-core/server';
import type { Option } from '@/components/layout/root-toggle';

export interface TabOptions {
  transform?: (option: Option, node: PageTree.Folder) => Option | null;
}

export function getSidebarTabs(
  pageTree: PageTree.Root,
  { transform }: TabOptions = {},
): Option[] {
  function findOptions(node: PageTree.Folder): Option[] {
    const results: Option[] = [];

    if (node.root) {
      const index = node.index ?? node.children.at(0);

      if (index?.type === 'page') {
        const option: Option = {
          url: index.url,
          title: node.name,
          icon: node.icon,
          description: node.description,

          urls: getFolderUrls(node),
        };

        const mapped = transform ? transform(option, node) : option;
        if (mapped) results.push(mapped);
      }
    }

    for (const child of node.children) {
      if (child.type === 'folder') results.push(...findOptions(child));
    }

    return results;
  }

  return findOptions(pageTree as PageTree.Folder);
}

function getFolderUrls(folder: PageTree.Folder): string[] {
  const results: string[] = [];
  if (folder.index) results.push(folder.index.url);

  for (const child of folder.children) {
    if (child.type === 'page') results.push(child.url);
    if (child.type === 'folder') results.push(...getFolderUrls(child));
  }

  return results;
}
