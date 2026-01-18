import type { LoaderPlugin } from '@/source/loader';
import type * as PageTree from '@/page-tree/definitions';
import type { ReactNode } from 'react';

export interface Item extends PageTree.Item {
  /**
   * Status badge to display in the sidebar (e.g., "new", "beta", "deprecated", "experimental").
   */
  status?: string;
}

export interface Folder extends Omit<PageTree.Folder, 'children' | 'index'> {
  index?: Item;
  children: Node[];
}

export type Separator = PageTree.Separator;

export type Node = Item | Folder | Separator;

/**
 * Plugin to add status badges to pages in the sidebar.
 *
 * This reads the `status` field from page frontmatter and adds it to the page tree item.
 * Define the `renderBadge` option to render it.
 *
 * @example
 * ```tsx
 * import { loader } from 'fumadocs-core/source';
 * import { statusBadgesPlugin } from 'fumadocs-core/source/status-badges';
 *
 * export const source = loader({
 *   plugins: [
 *     statusBadgesPlugin({
 *       renderBadge: (status) => <span>{status}</span>,
 *     }),
 *   ],
 *   // ...
 * });
 * ```
 *
 * Then in your frontmatter:
 * ```yaml
 * ---
 * title: My Page
 * status: new
 * ---
 * ```
 */
export function statusBadgesPlugin(
  options: {
    renderBadge?: (status: string) => ReactNode;
  } = {},
): LoaderPlugin {
  const { renderBadge = (status) => <span data-status={status}>{status}</span> } = options;

  return {
    name: 'fumadocs:status-badges',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;

        const file = this.storage.read(filePath);
        if (
          file?.format === 'page' &&
          'status' in file.data &&
          typeof file.data.status === 'string'
        ) {
          const status = file.data.status;

          node.name = (
            <>
              {node.name}
              {renderBadge(status)}
            </>
          );
          (node as Item).status = status;
        }

        return node;
      },
    },
  };
}
