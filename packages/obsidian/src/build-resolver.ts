import type { ParsedFile, VaultStorage } from '@/build-storage';
import path from 'node:path';
import { stash } from '@/utils/stash';

export interface VaultResolver {
  /**
   * resolve file by vault name
   */
  resolveName: (vaultName: string) => ParsedFile | undefined;

  /**
   * resolve file by vault path (from root directory)
   */
  resolvePath: (vaultPath: string) => ParsedFile | undefined;
}

export function buildResolver(storage: VaultStorage): VaultResolver {
  // a file should create two item in this map, one with extension, and one without.
  const pathToFile = new Map<string, ParsedFile>();
  // a file should create two item in this map, one with extension, and one without.
  const nameToFile = new Map<string, ParsedFile>();

  for (const file of storage.files.values()) {
    const parsed = path.parse(file.path);

    nameToFile.set(parsed.name, file);
    pathToFile.set(stash(path.join(parsed.dir, parsed.name)), file);

    nameToFile.set(parsed.base, file);
    pathToFile.set(file.path, file);

    // support aliases specified in frontmatter
    if (file.format === 'content' && file.frontmatter?.aliases) {
      for (const alias of file.frontmatter.aliases) {
        nameToFile.set(alias, file);
      }
    }
  }

  return {
    resolveName(vaultName: string) {
      return nameToFile.get(vaultName);
    },
    resolvePath(vaultPath: string) {
      return pathToFile.get(vaultPath);
    },
  };
}
