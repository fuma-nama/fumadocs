import type { LoaderPlugin, LoaderConfig } from '@/source/loader';
import type * as PageTree from '@/page-tree/definitions';

/**
 * Extended Item type with status field added by the plugin.
 */
export interface StatusBadgeItem extends PageTree.Item {
  /**
   * Status badge to display in the sidebar (e.g., "new", "beta", "deprecated", "experimental").
   *
   * The badge will be automatically truncated to 4 characters and displayed in uppercase.
   * Common values: "new" -> "NEW", "beta" -> "BETA", "deprecated" -> "DEPR", "experimental" -> "EXPE"
   */
  status?: string;
}

/**
 * Plugin to add status badges to pages in the sidebar.
 *
 * This reads the `status` field from page frontmatter and adds it to the page tree item.
 *
 * @example
 * ```ts
 * import { loader } from 'fumadocs-core/source';
 * import { statusBadgesPlugin } from 'fumadocs-core/source/plugins/status-badges';
 *
 * export default loader({
 *   plugins: [statusBadgesPlugin()],
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
export function statusBadgesPlugin<
  Config extends LoaderConfig = LoaderConfig,
>(): LoaderPlugin<Config> {
  return {
    name: 'fumadocs:status-badges',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;

        const file = this.storage.read(filePath);
        if (file?.format === 'page' && 'status' in file.data) {
          const status = file.data.status;
          if (typeof status === 'string') {
            (node as StatusBadgeItem).status = status;
          }
        }

        return node;
      },
    },
  };
}
