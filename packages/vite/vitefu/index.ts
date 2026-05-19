// Derived from vitefu v1.1.3 (MIT License).
// Copyright (c) 2026 Bjorn and Dominik.
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

interface CrawlFrameworkPkgsOptions {
  root: string;
  isFrameworkPkgByJson?: (pkgJson: Record<string, unknown>) => boolean;
  isFrameworkPkgByName?: (pkgName: string) => boolean | undefined;
  isSemiFrameworkPkgByJson?: (pkgJson: Record<string, unknown>) => boolean;
  isSemiFrameworkPkgByName?: (pkgName: string) => boolean | undefined;
}

interface CrawlFrameworkPkgsResult {
  optimizeDeps: {
    include: string[];
    exclude: string[];
  };
  ssr: {
    noExternal: string[];
  };
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: unknown;
  main?: string;
  module?: string;
  private?: boolean;
  type?: string;
  [key: string]: unknown;
}

export async function crawlFrameworkPkgs(
  options: CrawlFrameworkPkgsOptions,
): Promise<CrawlFrameworkPkgsResult> {
  const pkgJsonPath = await findClosestPkgJsonPath(options.root);

  if (!pkgJsonPath) {
    return {
      optimizeDeps: { include: [], exclude: [] },
      ssr: { noExternal: [] },
    };
  }

  const pkgJson = await readJson(pkgJsonPath).catch((e: unknown) => {
    throw new Error(`Unable to read ${pkgJsonPath}`, { cause: e });
  });

  const optimizeDepsInclude: string[] = [];
  const optimizeDepsExclude: string[] = [];
  const ssrNoExternal: string[] = [];

  await crawl(pkgJsonPath, pkgJson);

  optimizeDepsInclude.sort();
  optimizeDepsExclude.sort();
  ssrNoExternal.sort();

  return {
    optimizeDeps: {
      include: optimizeDepsInclude,
      exclude: optimizeDepsExclude,
    },
    ssr: {
      noExternal: ssrNoExternal,
    },
  };

  async function crawl(
    currentPkgJsonPath: string,
    currentPkgJson: PackageJson,
    parentDepNames: string[] = [],
    _parentIsFrameworkPkg = false,
    hasFrameworkAncestor = false,
  ) {
    const deps = Object.keys(currentPkgJson.dependencies ?? {}).filter(
      (dep) => !parentDepNames.includes(dep),
    );

    await Promise.all(
      deps.map(async (dep) => {
        const frameworkByName = options.isFrameworkPkgByName?.(dep);
        const semiFrameworkByName = options.isSemiFrameworkPkgByName?.(dep);

        if (frameworkByName === false || semiFrameworkByName === false) {
          return;
        }

        const depPkgJsonPath = await findDepPkgJsonPath(dep, currentPkgJsonPath);
        if (!depPkgJsonPath) return;

        const depPkgJson = await readJson(depPkgJsonPath).catch(() => {});
        if (!depPkgJson) return;

        const isFrameworkPkg =
          frameworkByName === true || options.isFrameworkPkgByJson?.(depPkgJson) === true;
        const isSemiFrameworkPkg =
          semiFrameworkByName === true || options.isSemiFrameworkPkgByJson?.(depPkgJson) === true;
        const depChain = parentDepNames.concat(dep);

        if (isFrameworkPkg || isSemiFrameworkPkg) {
          if (isFrameworkPkg) {
            pushUnique(optimizeDepsExclude, dep);
            pushUnique(ssrNoExternal, dep);
          } else {
            pushUnique(ssrNoExternal, dep);
          }

          await crawl(depPkgJsonPath, depPkgJson, depChain, true, true);
          return;
        }

        if (!hasFrameworkAncestor) return;

        const needsOptimization = await pkgNeedsOptimization(depPkgJson);

        if (needsOptimization) {
          addOptimizedDep(depChain);
        } else {
          await crawl(depPkgJsonPath, depPkgJson, depChain, false, true);
        }
      }),
    );
  }

  function addOptimizedDep(depChain: string[]) {
    for (const item of optimizeDepsInclude) {
      const segs = item.split(' > ');
      if (
        segs[0] === depChain[0] &&
        segs[segs.length - 1] === depChain[depChain.length - 1] &&
        segs.length <= depChain.length
      ) {
        // skip
        return;
      }
    }

    optimizeDepsInclude.push(depChain.join(' > '));
  }
}

export async function findClosestPkgJsonPath(
  dir: string,
  predicate?: (pkgJsonPath: string) => boolean | Promise<boolean>,
): Promise<string | undefined> {
  let currentDir = dir.endsWith('package.json') ? path.dirname(dir) : dir;

  while (currentDir) {
    const pkg = path.join(currentDir, 'package.json');

    try {
      const stat = await fs.stat(pkg);
      if (stat.isFile() && (!predicate || (await predicate(pkg)))) {
        return pkg;
      }
    } catch {
      // Keep walking up.
    }

    const nextDir = path.dirname(currentDir);
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }
}

export async function pkgNeedsOptimization(pkgJson: PackageJson): Promise<boolean> {
  if (pkgJson.module || pkgJson.exports || pkgJson.type === 'module') return false;

  if (pkgJson.main) {
    const entryExt = path.extname(pkgJson.main);
    return !entryExt || entryExt === '.js' || entryExt === '.cjs';
  }

  return false;
}

async function findDepPkgJsonPath(dep: string, parent: string): Promise<string | undefined> {
  let root = parent;

  while (root) {
    const pkg = path.join(root, 'node_modules', dep, 'package.json');

    try {
      await fs.access(pkg);
      return fsSync.realpathSync(pkg);
    } catch {
      // Keep walking up.
    }

    const nextRoot = path.dirname(root);
    if (nextRoot === root) break;
    root = nextRoot;
  }
}

export async function readJson(pkgJsonPath: string): Promise<PackageJson> {
  return JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as PackageJson;
}

function pushUnique(array: string[], value: string) {
  if (!array.includes(value)) array.push(value);
}
