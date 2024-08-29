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

  for (const doc of docs) {
    if (!doc._file.path.startsWith(rootDir)) continue;
    const parsed = path.parse(doc._file.path);

    if (pageTypes.includes(parsed.ext)) {
      outputs.push({
        type: 'page',
        path: doc._file.path,
        data: doc,
      });

      continue;
    }

    console.warn('Unknown Type:', parsed.ext);
  }

  for (const entry of meta) {
    if (!entry._file.path.startsWith(rootDir)) continue;
    const parsed = path.parse(entry._file.path);

    if (metaTypes.includes(parsed.ext)) {
      outputs.push({
        type: 'page',
        path: entry._file.path,
        data: entry,
      });
    }

    console.warn('Unknown Type:', parsed.ext);
  }

  return outputs;
}
