import type { ContentStorage } from '@/source/storage/content';
import type { PageTreeTransformer } from '@/source/page-tree/builder';
import type { LoaderConfig, ResolvedLoaderConfig } from '@/source/loader';

export interface LoaderPlugin<Config extends LoaderConfig = LoaderConfig> {
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
  config?: (config: ResolvedLoaderConfig) => ResolvedLoaderConfig | void | undefined;

  /**
   * transform the storage after loading
   */
  transformStorage?: (context: { storage: ContentStorage<Config['source']> }) => void;

  /**
   * transform the generated page tree
   */
  transformPageTree?: PageTreeTransformer<Config['source']>;
}

export type LoaderPluginOption<Config extends LoaderConfig = LoaderConfig> =
  | LoaderPlugin<Config>
  | LoaderPluginOption<Config>[]
  | undefined;

const priorityMap = {
  pre: 1,
  default: 0,
  post: -1,
};

export function buildPlugins(plugins: LoaderPluginOption[], sort = true): LoaderPlugin[] {
  const flatten: LoaderPlugin[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) flatten.push(...buildPlugins(plugin, false));
    else if (plugin) flatten.push(plugin);
  }

  if (sort)
    return flatten.sort(
      (a, b) => priorityMap[b.enforce ?? 'default'] - priorityMap[a.enforce ?? 'default'],
    );
  return flatten;
}
