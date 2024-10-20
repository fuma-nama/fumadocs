import type { PageTree } from 'fumadocs-core/server';
import type { Option } from '@/components/layout/root-toggle';

export interface TabOptions {
  transform?: (option: Option, node: PageTree.Folder) => Option | null;
}

export function getSidebarTabs(
  pageTree: PageTree.Root,
  { transform }: TabOptions = {},
): Option[] {
  const options: Option[] = [];

  function traverse(node: PageTree.Node): void {
    if (node.type === 'folder' && node.root && node.index) {
      const option: Option = {
        url: node.index.url,
        title: node.name,
        icon: node.icon,
        description: node.description,
      };

      const mapped = transform ? transform(option, node) : option;
      if (mapped) options.push(mapped);
    }

    if (node.type === 'folder') node.children.forEach(traverse);
  }

  pageTree.children.forEach(traverse);
  return options;
}
