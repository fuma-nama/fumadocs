import type { PageTree } from 'fumadocs-core/server';
import type { Option } from '@/components/layout/root-toggle';

export interface TabOptions {
  transform?: (option: Option, node: PageTree.Folder) => Option;
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

      options.push(transform ? transform(option, node) : option);
    }

    if (node.type === 'folder') node.children.forEach(traverse);
  }

  pageTree.children.forEach(traverse);
  return options;
}
