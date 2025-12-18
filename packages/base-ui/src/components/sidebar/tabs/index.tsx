import type * as PageTree from 'fumadocs-core/page-tree';
import type { ReactNode } from 'react';

export interface SidebarTab {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;

  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;

  /**
   * Detect from a list of urls
   */
  urls?: Set<string>;
  unlisted?: boolean;
}

export interface GetSidebarTabsOptions {
  transform?: (option: SidebarTab, node: PageTree.Folder) => SidebarTab | null;
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
): SidebarTab[] {
  const results: SidebarTab[] = [];

  function scanOptions(
    node: PageTree.Root | PageTree.Folder,
    unlisted?: boolean,
  ) {
    if ('root' in node && node.root) {
      const urls = getFolderUrls(node);

      if (urls.size > 0) {
        const option: SidebarTab = {
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
      if (child.type === 'folder') scanOptions(child, unlisted);
    }
  }

  scanOptions(tree);
  if (tree.fallback) scanOptions(tree.fallback, true);

  return results;
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
