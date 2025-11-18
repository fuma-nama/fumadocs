import type { ContentStorage } from '@/source/storage/content';
import type { PageTreeTransformer } from '@/source/page-tree/builder';
import type { ResolvedLoaderConfig, SourceConfig } from '@/source/loader';

export interface LoaderPlugin<Config extends SourceConfig = SourceConfig> {
  name?: string;

  /**
   * Change the order of plugin:
   * - `pre`: before normal plugins
   * - `post`: after normal plugins
   */
  enforce?: 'pre' | 'post';

  /**
   * receive & replace loader options
   */
  config?: (
    config: ResolvedLoaderConfig,
  ) => ResolvedLoaderConfig | void | undefined;

  /**
   * transform the storage after loading
   */
  transformStorage?: (context: {
    storage: ContentStorage<Config['pageData'], Config['metaData']>;
  }) => void;

  /**
   * transform the generated page tree
   */
  transformPageTree?: PageTreeTransformer<
    Config['pageData'],
    Config['metaData']
  >;
}

const priorityMap = {
  pre: 1,
  default: 0,
  post: -1,
};

export function buildPlugins(
  plugins: (LoaderPlugin | LoaderPlugin[] | undefined)[],
): LoaderPlugin[] {
  const flatten: LoaderPlugin[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) flatten.push(...plugin);
    else if (plugin) flatten.push(plugin);
  }

  return flatten.sort(
    (a, b) =>
      priorityMap[b.enforce ?? 'default'] - priorityMap[a.enforce ?? 'default'],
  );
}
