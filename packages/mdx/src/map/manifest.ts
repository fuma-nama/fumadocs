import * as fs from 'node:fs';
import * as path from 'node:path';
import { type LoadedConfig } from '@/config/load';
import type { MetaFile } from '@/loader-mdx';
import { getTypeFromPath } from '@/utils/get-type-from-path';

export interface Manifest {
  files: (MetaFile & {
    collection: string;
  })[];
}

export function getManifestEntryPath(originalPath: string): string {
  const toName = path
    .relative(process.cwd(), originalPath)
    .replaceAll(`..${path.sep}`, '-')
    .replaceAll(path.sep, '_');

  return path.resolve('.next/cache/fumadocs', `${toName}.json`);
}

export function writeManifest(to: string, config: LoadedConfig): void {
  const output: Manifest = { files: [] };

  for (const [file, collection] of config._runtime.files.entries()) {
    const type =
      config.collections.get(collection)?.type ?? getTypeFromPath(file);
    if (type === 'meta') continue;

    try {
      const content = fs.readFileSync(getManifestEntryPath(file));
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
