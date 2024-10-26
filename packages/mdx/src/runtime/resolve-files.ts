import type { VirtualFile } from 'fumadocs-core/source';
import type { BaseCollectionEntry } from '@/config';

interface ResolveOptions {
  docs: BaseCollectionEntry[];
  meta: BaseCollectionEntry[];

  rootDir?: string;
}

export function resolveFiles({
  docs,
  meta,
  rootDir = '',
}: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const entry of docs) {
    if (!entry._file.path.startsWith(rootDir)) continue;

    outputs.push({
      type: 'page',
      path: entry._file.path,
      data: entry,
    });
  }

  for (const entry of meta) {
    outputs.push({
      type: 'meta',
      path: entry._file.path,
      data: entry,
    });
  }

  return outputs;
}
