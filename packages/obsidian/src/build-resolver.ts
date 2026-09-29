import type { ParsedFile, VaultStorage } from '@/build-storage';
import path from 'node:path';
import { slash } from '@/utils/slash';

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

  // like Obsidian, ambiguous names prefer notes over attachments, then the
  // shortest path
  function setPreferred(map: Map<string, ParsedFile>, key: string, file: ParsedFile) {
    const existing = map.get(key);
    map.set(key, existing ? preferred(existing, file) : file);
  }

  for (const file of storage.files.values()) {
    const parsed = path.parse(file.path);

    setPreferred(nameToFile, parsed.name, file);
    setPreferred(pathToFile, slash(path.join(parsed.dir, parsed.name)), file);

    setPreferred(nameToFile, parsed.base, file);
    pathToFile.set(file.path, file);

    // support aliases specified in frontmatter
    if (file.format === 'content') {
      for (const alias of getAliases(file.frontmatter.aliases)) {
        setPreferred(nameToFile, alias, file);
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
        return this.resolvePath(slash(path.join(dir, name)));
      }

      // absolute path or name
      return this.resolvePath(name) ?? this.resolveName(name);
    },
  };
}

const FormatRank = { content: 0, data: 1, media: 2 } as const;

function preferred(a: ParsedFile, b: ParsedFile): ParsedFile {
  const format = FormatRank[a.format] - FormatRank[b.format];
  if (format !== 0) return format < 0 ? a : b;

  const depthA = a.path.split('/').length;
  const depthB = b.path.split('/').length;
  if (depthA !== depthB) return depthA < depthB ? a : b;

  return a.path <= b.path ? a : b;
}

/** Obsidian accepts both `aliases: name` and the list form */
function getAliases(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((alias) => typeof alias === 'string');
  return [];
}

export function resolveInternalHref(
  href: string,
  sourceFile: ParsedFile,
  resolver: VaultResolver,
): [ParsedFile | undefined, hash: string | undefined] {
  const [name, hash] = href.split('#', 2);
  return [resolver.resolveAny(name, sourceFile.path), hash];
}
