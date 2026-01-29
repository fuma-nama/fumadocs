import type {
  ContentStorage,
  PageTreeBuilderContext,
  PageTreeTransformer,
  SourceConfig,
} from '@/source';
import { FileSystem } from '@/source';

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

        const content = this.storage.read(file);
        if (content) isolatedStorage.write(file, content);
      }

      root.fallback = this.builder.build(isolatedStorage, {
        id: `fallback-${this.rootId}`,
        noRef: this.noRef,
        transformers: this.transformers,
        generateFallback: false,
        context: { ...this.custom, _fallback: true },
      });

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
