import type {
  MetaData,
  MetaFile,
  PageData,
  PageFile,
  PageTreeTransformer,
  Transformer,
} from '@/source';
import type * as PageTree from '@/page-tree/definitions';
import type { LoaderPlugin } from '@/source/plugins';

export interface LegacyLoaderOptions {
  /**
   * We recommend you to use `plugins` instead
   */
  transformers?: Transformer[];
}

export interface LegacyPageTreeOptions<
  Page extends PageData,
  Meta extends MetaData,
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
export function compatPlugin<Page extends PageData, Meta extends MetaData>(
  loader: LegacyLoaderOptions,
  pageTreeOptions?: LegacyPageTreeOptions<Page, Meta>,
): LoaderPlugin<Page, Meta> {
  return {
    name: 'fumadocs:compat',
    config(config) {
      const plugins = (
        config.plugins ? [...config.plugins] : []
      ) as LoaderPlugin<Page, Meta>[];

      if (pageTreeOptions) {
        const { attachFile, attachSeparator, attachFolder, transformers } =
          pageTreeOptions;

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
                  children: files.flatMap(
                    (file) => this.storage.read(file) ?? [],
                  ),
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

      if (loader.transformers) {
        for (const transformer of loader.transformers) {
          plugins.push(fromStorageTransformer(transformer));
        }
      }

      return {
        ...config,
        plugins: plugins as LoaderPlugin[],
      };
    },
  };
}

function fromPageTreeTransformer<Page extends PageData, Meta extends MetaData>(
  transformer: PageTreeTransformer<Page, Meta>,
): LoaderPlugin<Page, Meta> {
  return {
    transformPageTree: transformer,
  };
}

function fromStorageTransformer<Page extends PageData, Meta extends MetaData>(
  transformer: Transformer,
): LoaderPlugin<Page, Meta> {
  return {
    transformStorage: transformer,
  };
}
