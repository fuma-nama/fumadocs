import path from 'node:path';
import type { VirtualFile } from 'fumadocs-core/source';
import { type CollectionEntry } from '@/config';

const pageTypes = ['.md', '.mdx'];
const metaTypes = ['.json', '.yaml'];

interface ResolveOptions {
  docs: CollectionEntry<'doc', unknown>[];
  meta: CollectionEntry<'meta', unknown>[];

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
    const ext = path.extname(entry._file.path);

    if (pageTypes.includes(ext)) {
      outputs.push({
        type: 'page',
        path: entry._file.path,
        data: entry,
      });

      continue;
    }

    console.warn(
      `Unknown Type: ${ext} on ${entry._file.path}, expected: ${pageTypes.toString()}`,
    );
  }

  for (const entry of meta) {
    if (!entry._file.path.startsWith(rootDir)) continue;
    const ext = path.extname(entry._file.path);

    if (metaTypes.includes(ext)) {
      outputs.push({
        type: 'meta',
        path: entry._file.path,
        data: entry,
      });

      continue;
    }

    console.warn(
      `Unknown Type: ${ext} on ${entry._file.path}, expected: ${metaTypes.toString()}`,
    );
  }

  return outputs;
}
