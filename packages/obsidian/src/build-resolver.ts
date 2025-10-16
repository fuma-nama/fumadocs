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

  /**
   * resolve file by:
   * 1. relative vault path
   * 2. full vault path
   * 3. vault name/alias
   *
   * @param name - target
   * @param fromPath - the path of referencer vault file
   */
  resolveAny: (name: string, fromPath: string) => ParsedFile | undefined;
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
    resolveAny(name, fromPath) {
      const dir = path.dirname(fromPath);

      if (name.startsWith('./') || name.startsWith('../')) {
        return this.resolvePath(stash(path.join(dir, name)));
      }

      // absolute path or name
      return this.resolvePath(name) ?? this.resolveName(name);
    },
  };
}

export function resolveInternalHref(
  href: string,
  sourceFile: ParsedFile,
  resolver: VaultResolver,
): [ParsedFile | undefined, hash: string | undefined] {
  const [name, hash] = href.split('#', 2);
  return [resolver.resolveAny(name, sourceFile.path), hash];
}
