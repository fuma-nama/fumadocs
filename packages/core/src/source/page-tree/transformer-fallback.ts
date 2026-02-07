import {
  FileSystem,
  type ContentStorage,
  type PageTreeBuilderContext,
  type PageTreeTransformer,
  type SourceConfig,
} from '@/source';
import { PageTreeBuilder } from '@/source/page-tree/builder';

export function transformerFallback(): PageTreeTransformer {
  const addedFiles = new Set<string>();
  function shouldIgnore(context: PageTreeBuilderContext<SourceConfig>) {
    return context.custom?._fallback === true;
  }

  return {
    root(root) {
      if (shouldIgnore(this)) return root;
      const isolatedStorage: ContentStorage = new FileSystem();
      if (addedFiles.size === this.storage.files.size) return root;

      for (const file of this.storage.getFiles()) {
        if (addedFiles.has(file)) continue;

        isolatedStorage.write(file, this.storage.read(file)!);
      }

      root.fallback = new PageTreeBuilder(isolatedStorage, {
        idPrefix: this.idPrefix ? `fallback:${this.idPrefix}` : 'fallback',
        url: this.getUrl,
        noRef: this.noRef,
        transformers: this.transformers,
        generateFallback: false,
        context: { ...this.custom, _fallback: true },
      }).root();

      addedFiles.clear();
      return root;
    },
    file(node, file) {
      if (shouldIgnore(this)) return node;
      if (file) addedFiles.add(file);

      return node;
    },
    folder(node, _dir, metaPath) {
      if (shouldIgnore(this)) return node;
      if (metaPath) addedFiles.add(metaPath);

      return node;
    },
  };
}
