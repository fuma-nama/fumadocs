import type { ContentStorage } from '@/source/load-files';
import type { PageTreeTransformer } from '@/source/page-tree/builder';
import type { MetaData, PageData } from '@/source/types';
import type { ResolvedLoaderConfig } from '@/source/loader';

export interface LoaderPlugin<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
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
  config?: (config: ResolvedLoaderConfig) => ResolvedLoaderConfig | undefined;

  /**
   * transform the storage after loading
   */
  transformStorage?: (context: { storage: ContentStorage<Page, Meta> }) => void;

  /**
   * transform the generated page tree
   */
  transformPageTree?: PageTreeTransformer<Page, Meta>;
}

export function buildPlugins<Page extends PageData, Meta extends MetaData>(
  plugins: (LoaderPlugin<Page, Meta> | undefined)[],
): LoaderPlugin<Page, Meta>[] {
  const out: LoaderPlugin<Page, Meta>[] = [];

  for (const plugin of plugins) {
    if (plugin && plugin.enforce === 'pre') {
      out.push(plugin);
    }
  }

  for (const plugin of plugins) {
    if (plugin && plugin.enforce === undefined) {
      out.push(plugin);
    }
  }

  for (const plugin of plugins) {
    if (plugin && plugin.enforce === 'post') {
      out.push(plugin);
    }
  }

  return out;
}
