import {
  ContentStorage,
  MetaData,
  MetaFile,
  PageData,
  PageFile,
  PageTreeTransformer,
} from '@/source';
import type * as PageTree from '@/page-tree/definitions';
import type { LoaderPlugin } from '@/source/plugins';

export type TransformContentStorage = (context: {
  storage: ContentStorage;
}) => void;

export interface LegacyLoaderOptions {
  /**
   * We recommend you to use `plugins` instead
   */
  transformers?: TransformContentStorage[];
}

export interface LegacyPageTreeOptions<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  /**
   * @deprecated use `plugins` instead
   */
  attachFile?: (node: PageTree.Item, file?: PageFile<Page>) => PageTree.Item;
  /**
   * @deprecated use `plugins` instead
   */
  attachFolder?: (
    node: PageTree.Folder,
    folder: {
      children: (PageFile<Page> | MetaFile<Meta>)[];
    },
    meta?: MetaFile<Meta>,
  ) => PageTree.Folder;
  /**
   * @deprecated use `plugins` instead
   */
  attachSeparator?: (node: PageTree.Separator) => PageTree.Separator;

  /**
   * We recommend you to use `plugins` instead
   */
  transformers?: PageTreeTransformer<Page, Meta>[];
}

/**
 * legacy features compatibility layer
 */
export function compatPlugin({
  pageTree,
  transformers,
}: LegacyLoaderOptions & { pageTree?: LegacyPageTreeOptions }): LoaderPlugin[] {
  const plugins: LoaderPlugin[] = [];

  if (pageTree) {
    const { attachFile, attachSeparator, attachFolder, transformers } =
      pageTree;

    for (const transformer of transformers ?? []) {
      plugins.push(fromPageTreeTransformer(transformer));
    }

    plugins.push(
      fromPageTreeTransformer({
        file(node, file) {
          if (!attachFile) return node;
          const content = file ? this.storage.read(file) : undefined;

          return attachFile(
            node,
            content?.format === 'page' ? content : undefined,
          );
        },
        folder(node, folderPath, metaPath) {
          if (!attachFolder) return node;

          const files = this.storage.readDir(folderPath) ?? [];
          const meta = metaPath ? this.storage.read(metaPath) : undefined;

          return attachFolder(
            node,
            {
              children: files.flatMap((file) => this.storage.read(file) ?? []),
            },
            meta?.format === 'meta' ? meta : undefined,
          );
        },
        separator(node) {
          if (!attachSeparator) return node;

          return attachSeparator(node);
        },
      }),
    );
  }

  if (transformers) {
    for (const transformer of transformers) {
      plugins.push(fromStorageTransformer(transformer));
    }
  }

  return plugins;
}

function fromPageTreeTransformer<Page extends PageData, Meta extends MetaData>(
  transformer: PageTreeTransformer<Page, Meta>,
): LoaderPlugin<Page, Meta> {
  return {
    transformPageTree: transformer,
  };
}

function fromStorageTransformer<Page extends PageData, Meta extends MetaData>(
  transformer: TransformContentStorage,
): LoaderPlugin<Page, Meta> {
  return {
    transformStorage: transformer,
  };
}
