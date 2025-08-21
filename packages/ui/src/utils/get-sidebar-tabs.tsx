import type { PageTree } from 'fumadocs-core/server';
import type { Option } from '@/components/layout/root-toggle';

export interface GetSidebarTabsOptions {
  transform?: (option: Option, node: PageTree.Folder) => Option | null;
}

const defaultTransform: GetSidebarTabsOptions['transform'] = (option, node) => {
  if (!node.icon) return option;

  return {
    ...option,
    icon: (
      <div className="size-full [&_svg]:size-full max-md:p-1.5 max-md:rounded-md max-md:border max-md:bg-fd-secondary">
        {node.icon}
      </div>
    ),
  };
};

export function getSidebarTabs(
  tree: PageTree.Root,
  { transform = defaultTransform }: GetSidebarTabsOptions = {},
): Option[] {
  function findOptions(
    node: PageTree.Root | PageTree.Folder,
    unlisted?: boolean,
  ): Option[] {
    const results: Option[] = [];

    if ('root' in node && node.root) {
      const urls = getFolderUrls(node);

      if (urls.size > 0) {
        const option: Option = {
          url: urls.values().next().value ?? '',
          title: node.name,
          icon: node.icon,
          unlisted,
          description: node.description,
          urls,
        };

        const mapped = transform ? transform(option, node) : option;
        if (mapped) results.push(mapped);
      }
    }

    for (const child of node.children) {
      if (child.type === 'folder')
        results.push(...findOptions(child, unlisted));
    }

    return results;
  }

  const options = findOptions(tree);
  if (tree.fallback) {
    options.push(...findOptions(tree.fallback, true));
  }

  return options;
}

function getFolderUrls(
  folder: PageTree.Folder,
  output: Set<string> = new Set(),
): Set<string> {
  if (folder.index) output.add(folder.index.url);

  for (const child of folder.children) {
    if (child.type === 'page' && !child.external) output.add(child.url);
    if (child.type === 'folder') getFolderUrls(child, output);
  }

  return output;
}
