import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { type LoadedConfig } from '@/config/load';
import type { MetaFile } from '@/loader-mdx';
import { getTypeFromPath } from '@/utils/get-type-from-path';

export interface Manifest {
  files: (MetaFile & {
    collection: string;
  })[];
}

export function getKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function writeManifest(to: string, config: LoadedConfig): void {
  const output: Manifest = { files: [] };

  for (const [file, collection] of config._runtime.files.entries()) {
    const type =
      config.collections.get(collection)?.type ?? getTypeFromPath(file);
    if (type === 'meta') continue;

    try {
      const content = fs.readFileSync(
        path.resolve('.next/cache/fumadocs', `${getKey(file)}.json`),
      );
      const meta = JSON.parse(content.toString()) as MetaFile;

      output.files.push({
        ...meta,
        collection,
      });
    } catch (e) {
      console.error(`cannot find the search index of ${file}`, e);
    }
  }

  fs.writeFileSync(to, JSON.stringify(output));
}
