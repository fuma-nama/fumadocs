import type {
  MetaData,
  MetaFile,
  PageData,
  PageFile,
  PageTreeTransformer,
} from '@/source';
import type * as PageTree from './definitions';

export interface LegacyTransformerOptions<
  Page extends PageData,
  Meta extends MetaData,
> {
  /**
   * @deprecated use `transformers` instead
   */
  attachFile?: (node: PageTree.Item, file?: PageFile<Page>) => PageTree.Item;
  /**
   * @deprecated use `transformers` instead
   */
  attachFolder?: (
    node: PageTree.Folder,
    folder: {
      children: (PageFile<Page> | MetaFile<Meta>)[];
    },
    meta?: MetaFile<Meta>,
  ) => PageTree.Folder;
  /**
   * @deprecated use `transformers` instead
   */
  attachSeparator?: (node: PageTree.Separator) => PageTree.Separator;
}

export function legacyTransformer<Page extends PageData, Meta extends MetaData>(
  transformer: LegacyTransformerOptions<Page, Meta>,
): PageTreeTransformer<Page, Meta> {
  return {
    file(node, file) {
      if (!transformer.attachFile) return node;
      const content = file
        ? (this.localeStorage?.read(file) ?? this.storage.read(file))
        : undefined;

      return transformer.attachFile(
        node,
        content?.format === 'page' ? content : undefined,
      );
    },
    folder(node, folderPath, metaPath) {
      if (!transformer.attachFolder) return node;

      const files = this.storage.readDir(folderPath) ?? [];
      const meta = metaPath
        ? (this.localeStorage?.read(metaPath) ?? this.storage.read(metaPath))
        : undefined;

      return transformer.attachFolder(
        node,
        {
          children: files.flatMap(
            (file) =>
              this.localeStorage?.read(file) ?? this.storage.read(file) ?? [],
          ),
        },
        meta?.format === 'meta' ? meta : undefined,
      );
    },
    separator(node) {
      if (!transformer.attachSeparator) return node;

      return transformer.attachSeparator(node);
    },
  };
}
