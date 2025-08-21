import type { ContentStorage, PageTreeTransformer } from '@/source';
import { FileSystem } from '@/source';

export function transformerFallback(): PageTreeTransformer {
  const addedFiles = new Set<string>();

  return {
    name: 'fumadocs:fallback',
    root(root) {
      const isolatedStorage: ContentStorage = new FileSystem();

      for (const file of this.storage.getFiles()) {
        if (addedFiles.has(file)) continue;

        const content = this.storage.read(file);
        if (content) isolatedStorage.write(file, content);
      }

      if (isolatedStorage.getFiles().length === 0) return root;

      root.fallback = this.builder.build({
        ...this.options,
        id: `fallback-${root.$id ?? ''}`,
        storage: isolatedStorage,
        generateFallback: false,
      });

      addedFiles.clear();
      return root;
    },
    file(node, file) {
      if (file) addedFiles.add(file);

      return node;
    },
    folder(node, _dir, metaPath) {
      if (metaPath) addedFiles.add(metaPath);

      return node;
    },
  };
}
