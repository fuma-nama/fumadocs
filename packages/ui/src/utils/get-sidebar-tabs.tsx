import type { PageTree } from 'fumadocs-core/server';
import type { LoaderConfig, LoaderOutput } from 'fumadocs-core/source';
import type { Option } from '@/components/layout/root-toggle';

export interface TabOptions {
  source?: LoaderOutput<LoaderConfig>;
  transform?: (option: Option, node: PageTree.Folder) => Option;
}

export function getSidebarTabs(
  pageTree: PageTree.Root,
  { source, transform }: TabOptions = {},
): Option[] {
  const options: Option[] = [];

  function traverse(node: PageTree.Node): void {
    if (node.type === 'folder' && node.root && node.index) {
      const meta = source?.getNodeMeta(node);
      const option: Option = {
        url: node.index.url,
        title: node.name,
        icon: node.icon,
        description:
          meta &&
          'description' in meta.data &&
          typeof meta.data.description === 'string'
            ? meta.data.description
            : undefined,
      };

      options.push(transform ? transform(option, node) : option);
    }

    if (node.type === 'folder') node.children.forEach(traverse);
  }

  pageTree.children.forEach(traverse);
  return options;
}
