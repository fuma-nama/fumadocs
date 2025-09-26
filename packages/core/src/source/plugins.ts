import type { ContentStorage } from '@/source/load-files';
import type { PageTreeTransformer } from '@/source/page-tree/builder';
import type { MetaData, PageData } from '@/source/types';

export type LoaderPlugins<
  Page extends PageData,
  Meta extends MetaData,
> = LoaderPlugin<Page, Meta>[];

export interface LoaderPlugin<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
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
  plugins: LoaderPlugins<Page, Meta>,
): LoaderPlugin<Page, Meta>[] {
  return plugins;
}
