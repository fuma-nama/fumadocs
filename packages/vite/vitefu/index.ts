// Derived from vitefu v1.1.3 (MIT License).
// Copyright (c) 2026 Bjorn and Dominik.
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: unknown;
  main?: string;
  module?: string;
  type?: string;
}

interface Node {
  pkgJsonPath: string;
  pkgJson?: PackageJson;
  /** dependency names from the root down to this package */
  chain: string[];
}

export interface CrawlResult {
  /** framework packages in the tree */
  framework: string[];
  /** `optimizeDeps.include` entries for the CommonJS packages below them */
  include: string[];
}

let pnp: { resolveToUnqualified(dep: string, parent: string): string | undefined } | undefined;

if (process.versions.pnp) {
  try {
    pnp = createRequire(import.meta.url)('pnpapi');
  } catch {
    // not available outside PnP
  }
}

/**
 * Breadth-first, so each `package.json` is read once however many chains reach it, and the chain
 * recorded for a CommonJS package is the shortest one (ties broken by name): Vite hashes
 * `optimizeDeps.include`, the output must not depend on I/O order.
 */
export async function crawlFrameworkPkgs(
  root: string,
  isFrameworkPkg: (name: string) => boolean | undefined,
): Promise<CrawlResult> {
  const rootPkgJsonPath = await findClosestPkgJsonPath(root);
  if (!rootPkgJsonPath) return { framework: [], include: [] };

  const framework = new Set<string>();
  const include: string[] = [];
  const visited = new Set([rootPkgJsonPath]);
  let discovered = new Map<string, Node>();
  let level: Node[] = [
    { pkgJsonPath: rootPkgJsonPath, pkgJson: await readJson(rootPkgJsonPath), chain: [] },
  ];

  async function visit(parent: Node, dep: string) {
    const pkgJsonPath = await findDepPkgJsonPath(dep, parent.pkgJsonPath);
    if (!pkgJsonPath) return;
    if (isFrameworkPkg(dep)) framework.add(dep);
    if (visited.has(pkgJsonPath)) return;

    const chain = [...parent.chain, dep];
    const found = discovered.get(pkgJsonPath);
    if (found) {
      if (compareChains(chain, found.chain) < 0) found.chain = chain;
      return;
    }

    const node: Node = { pkgJsonPath, chain };
    discovered.set(pkgJsonPath, node);
    node.pkgJson = await readJson(pkgJsonPath).catch(() => undefined);
  }

  while (level.length > 0) {
    const tasks: Promise<void>[] = [];
    discovered = new Map();

    for (const node of level) {
      const isRoot = node.chain.length === 0;
      const deps = Object.keys(node.pkgJson!.dependencies ?? {});
      if (isRoot) deps.push(...Object.keys(node.pkgJson!.devDependencies ?? {}));

      for (const dep of deps) {
        const flag = isFrameworkPkg(dep);
        // only what sits below a framework package is served unbundled
        if (flag === false || (isRoot && !flag)) continue;
        tasks.push(visit(node, dep));
      }
    }
    await Promise.all(tasks);

    level = [];
    tasks.length = 0;
    for (const node of discovered.values()) {
      visited.add(node.pkgJsonPath);
      if (!node.pkgJson) continue;

      tasks.push(
        pkgNeedsOptimization(node.pkgJson, node.pkgJsonPath).then((needed) => {
          if (!needed) {
            level.push(node);
            return;
          }

          const chain = node.chain.join(' > ');
          for (const subpath of getExportsSubpaths(node.pkgJson!.exports)) {
            include.push(subpath === '.' ? chain : chain + subpath.slice(1));
          }
        }),
      );
    }
    await Promise.all(tasks);
  }

  return { framework: [...framework].sort(), include: include.sort() };
}

function compareChains(left: string[], right: string[]) {
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

async function findClosestPkgJsonPath(dir: string): Promise<string | undefined> {
  for (let current = dir; ; current = path.dirname(current)) {
    const pkg = path.join(current, 'package.json');
    const stat = await fs.stat(pkg).catch(() => undefined);
    if (stat?.isFile()) return pkg;
    if (path.dirname(current) === current) return;
  }
}

async function pkgNeedsOptimization(pkgJson: PackageJson, pkgJsonPath: string): Promise<boolean> {
  if (pkgJson.module || pkgJson.type === 'module') return false;

  // an export map alone doesn't imply ESM: CJS-only packages (e.g. `use-sync-external-store`)
  // ship one too, and still need pre-bundling for the browser. Declaration-only packages
  // (e.g. `@types/mdx`) also ship one, with no runtime JS at all — pre-bundling those makes
  // esbuild parse `.d.ts` files and fail on type-space imports
  if (pkgJson.exports)
    return !exportsHasEsmEntry(pkgJson.exports) && exportsHasJsEntry(pkgJson.exports);

  if (pkgJson.main) {
    const entryExt = path.extname(pkgJson.main);
    return !entryExt || entryExt === '.js' || entryExt === '.cjs';
  }

  try {
    await fs.access(path.join(path.dirname(pkgJsonPath), 'index.js'));
    return true;
  } catch {
    return false;
  }
}

function exportsHasEsmEntry(exportsField: unknown): boolean {
  if (typeof exportsField === 'string') return exportsField.endsWith('.mjs');
  if (Array.isArray(exportsField)) return exportsField.some(exportsHasEsmEntry);
  if (exportsField && typeof exportsField === 'object') {
    return Object.entries(exportsField).some(
      ([key, value]) => key === 'import' || key === 'module' || exportsHasEsmEntry(value),
    );
  }
  return false;
}

// whether any target is runtime JS, as opposed to declaration files (`.d.ts` and friends) or
// assets like `./package.json`; the `types` condition never resolves at runtime
function exportsHasJsEntry(exportsField: unknown): boolean {
  if (typeof exportsField === 'string') return /\.[cm]?js$/.test(exportsField);
  if (Array.isArray(exportsField)) return exportsField.some(exportsHasJsEntry);
  if (exportsField && typeof exportsField === 'object') {
    return Object.entries(exportsField).some(
      ([key, value]) => key !== 'types' && exportsHasJsEntry(value),
    );
  }
  return false;
}

// Vite only pre-bundles the entries listed in `optimizeDeps.include`, so a CJS package's
// deep imports (e.g. `use-sync-external-store/shim`) must each become their own entry.
// Keys with wildcards or file extensions (incl. `.native`) are skipped: they either can't be
// listed as-is or duplicate an extensionless key.
function getExportsSubpaths(exportsField: unknown): string[] {
  if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return ['.'];
  }

  const subpaths: string[] = [];
  let hasSubpathKeys = false;
  for (const [key, value] of Object.entries(exportsField)) {
    if (!key.startsWith('.')) continue;
    hasSubpathKeys = true;
    if ((key === '.' || /^\.\/[^*.]+$/.test(key)) && exportsHasJsEntry(value)) subpaths.push(key);
  }
  return hasSubpathKeys ? subpaths : ['.'];
}

async function findDepPkgJsonPath(dep: string, parent: string): Promise<string | undefined> {
  if (pnp) {
    try {
      const depRoot = pnp.resolveToUnqualified(dep, parent);
      return depRoot ? path.join(depRoot, 'package.json') : undefined;
    } catch {
      return;
    }
  }

  for (let root = parent; ; root = path.dirname(root)) {
    const pkg = path.join(root, 'node_modules', dep, 'package.json');
    try {
      await fs.access(pkg);
      return fsSync.realpathSync(pkg);
    } catch {
      if (path.dirname(root) === root) return;
    }
  }
}

async function readJson(pkgJsonPath: string): Promise<PackageJson> {
  return JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
}
