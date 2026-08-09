// Derived from vitefu v1.1.3 (MIT License).
// Copyright (c) 2026 Bjorn and Dominik.
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { DepOptimizationOptions, SSROptions, UserConfig } from 'vite';

interface CrawlFrameworkPkgsOptions {
  root: string;
  isBuild: boolean;
  workspaceRoot?: string;
  viteUserConfig?: UserConfig;
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
    external: string[];
  };
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: unknown;
  main?: string;
  module?: string;
  private?: boolean;
  [key: string]: unknown;
}

interface PnpApi {
  getDependencyTreeRoots(): Array<{ name: string; reference: string }>;
  getPackageInformation(locator: { name: string; reference: string }): {
    packageLocation: string;
  };
  resolveToUnqualified(dep: string, parent: string): string | undefined;
}

let pnp: PnpApi | undefined;
let pnpWorkspaceLocators: Array<{ name: string; reference: string }> = [];

if (process.versions.pnp) {
  try {
    pnp = createRequire(import.meta.url)('pnpapi') as PnpApi;
    pnpWorkspaceLocators = pnp.getDependencyTreeRoots();
  } catch {
    // Non-PnP installs do not need this branch.
  }
}

export async function crawlFrameworkPkgs(
  options: CrawlFrameworkPkgsOptions,
): Promise<CrawlFrameworkPkgsResult> {
  const pkgJsonPath = await findClosestPkgJsonPath(options.root);

  if (!pkgJsonPath) {
    return {
      optimizeDeps: { include: [], exclude: [] },
      ssr: { noExternal: [], external: [] },
    };
  }

  const pkgJson = await readJson(pkgJsonPath).catch((e: unknown) => {
    throw new Error(`Unable to read ${pkgJsonPath}`, { cause: e });
  });

  const optimizeDepsIncludeByPkgJsonPath = new Map<string, string>();
  const optimizeDepsSubpathsByPkgJsonPath = new Map<string, string[]>();
  let optimizeDepsInclude: string[] = [];
  let optimizeDepsExclude: string[] = [];
  let ssrNoExternal: string[] = [];
  let ssrExternal: string[] = [];

  await crawl(pkgJsonPath, pkgJson);
  optimizeDepsInclude = [...optimizeDepsIncludeByPkgJsonPath.entries()].flatMap(
    ([depPkgJsonPath, chain]) =>
      (optimizeDepsSubpathsByPkgJsonPath.get(depPkgJsonPath) ?? ['.']).map((subpath) =>
        subpath === '.' ? chain : chain + subpath.slice(1),
      ),
  );

  if (options.viteUserConfig) {
    const userOptimizeDepsExclude = options.viteUserConfig.optimizeDeps?.exclude;
    if (userOptimizeDepsExclude) {
      optimizeDepsInclude = optimizeDepsInclude.filter(
        (dep) => !isDepExcluded(dep, userOptimizeDepsExclude),
      );
    }

    const userOptimizeDepsInclude = options.viteUserConfig.optimizeDeps?.include;
    if (userOptimizeDepsInclude) {
      optimizeDepsExclude = optimizeDepsExclude.filter(
        (dep) => !isDepIncluded(dep, userOptimizeDepsInclude),
      );
    }

    const userSsrExternal = options.viteUserConfig.ssr?.external;
    if (userSsrExternal) {
      ssrNoExternal = ssrNoExternal.filter((dep) => !isDepExternaled(dep, userSsrExternal));
    }

    const userSsrNoExternal = options.viteUserConfig.ssr?.noExternal;
    if (userSsrNoExternal) {
      ssrExternal = ssrExternal.filter((dep) => !isDepNoExternaled(dep, userSsrNoExternal));
    }
  }

  optimizeDepsInclude.sort();
  optimizeDepsExclude.sort();
  ssrExternal.sort();
  ssrNoExternal.sort();

  return {
    optimizeDeps: {
      include: optimizeDepsInclude,
      exclude: optimizeDepsExclude,
    },
    ssr: {
      noExternal: ssrNoExternal,
      external: ssrExternal,
    },
  };

  async function crawl(
    currentPkgJsonPath: string,
    currentPkgJson: PackageJson,
    parentDepNames: string[] = [],
    parentIsFrameworkPkg = false,
    hasFrameworkAncestor = false,
  ) {
    const isRoot = parentDepNames.length === 0;
    const crawlDevDependencies =
      isRoot ||
      isPrivateWorkspacePackage(currentPkgJsonPath, currentPkgJson, options.workspaceRoot);

    const deps = [
      ...Object.keys(currentPkgJson.dependencies ?? {}),
      ...(crawlDevDependencies ? Object.keys(currentPkgJson.devDependencies ?? {}) : []),
    ].filter((dep) => !parentDepNames.includes(dep));

    await Promise.all(
      deps.map(async (dep) => {
        const frameworkByName = options.isFrameworkPkgByName?.(dep);
        const semiFrameworkByName = options.isSemiFrameworkPkgByName?.(dep);

        if (frameworkByName === false || semiFrameworkByName === false) {
          return;
        }

        const depPkgJsonPath = await findDepPkgJsonPath(
          dep,
          currentPkgJsonPath,
          !!options.workspaceRoot,
        );
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

        const needsOptimization = await pkgNeedsOptimization(depPkgJson, depPkgJsonPath);

        if (needsOptimization) {
          addOptimizedDep(depPkgJsonPath, depChain, depPkgJson);
        } else {
          await crawl(depPkgJsonPath, depPkgJson, depChain, false, true);
        }

        if (!options.isBuild && parentIsFrameworkPkg) {
          pushUnique(ssrExternal, dep);
        }
      }),
    );
  }

  function addOptimizedDep(depPkgJsonPath: string, depChain: string[], depPkgJson: PackageJson) {
    const includePath = depChain.join(' > ');
    const current = optimizeDepsIncludeByPkgJsonPath.get(depPkgJsonPath);

    if (!current || compareDepChains(includePath, current) < 0) {
      optimizeDepsIncludeByPkgJsonPath.set(depPkgJsonPath, includePath);
    }

    if (!optimizeDepsSubpathsByPkgJsonPath.has(depPkgJsonPath)) {
      optimizeDepsSubpathsByPkgJsonPath.set(depPkgJsonPath, getExportsSubpaths(depPkgJson.exports));
    }
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

export async function pkgNeedsOptimization(
  pkgJson: PackageJson,
  pkgJsonPath: string,
): Promise<boolean> {
  if (pkgJson.module || pkgJson.type === 'module') return false;

  // an export map alone doesn't imply ESM: CJS-only packages (e.g. `use-sync-external-store`)
  // ship one too, and still need pre-bundling for the browser
  if (pkgJson.exports) return !exportsHasEsmEntry(pkgJson.exports);

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

// Vite only pre-bundles the entries listed in `optimizeDeps.include`, so a CJS package's
// deep imports (e.g. `use-sync-external-store/shim`) must each become their own entry.
// Keys with wildcards or file extensions (incl. `.native`) are skipped: they either can't be
// listed as-is or duplicate an extensionless key.
function getExportsSubpaths(exportsField: unknown): string[] {
  if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return ['.'];
  }

  const subpathKeys = Object.keys(exportsField).filter((key) => key.startsWith('.'));
  if (subpathKeys.length === 0) return ['.'];

  const subpaths = subpathKeys.filter((key) => key === '.' || /^\.\/[^*.]+$/.test(key));
  return subpaths.length > 0 ? subpaths : ['.'];
}

async function findDepPkgJsonPath(
  dep: string,
  parent: string,
  usePnpWorkspaceLocators: boolean,
): Promise<string | undefined> {
  if (pnp) {
    if (usePnpWorkspaceLocators) {
      try {
        const locator = pnpWorkspaceLocators.find((root) => root.name === dep);
        if (locator) {
          const pkgPath = pnp.getPackageInformation(locator).packageLocation;
          return path.resolve(pkgPath, 'package.json');
        }
      } catch {
        // Fall back to normal PnP resolution.
      }
    }

    try {
      const depRoot = pnp.resolveToUnqualified(dep, parent);
      if (!depRoot) return;
      return path.join(depRoot, 'package.json');
    } catch {
      return;
    }
  }

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

async function readJson(pkgJsonPath: string): Promise<PackageJson> {
  return JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as PackageJson;
}

function isPrivateWorkspacePackage(
  pkgJsonPath: string,
  pkgJson: PackageJson,
  workspaceRoot?: string,
) {
  return !!(
    workspaceRoot &&
    pkgJson.private &&
    !pkgJsonPath.match(/[/\\]node_modules[/\\]/) &&
    !path.relative(workspaceRoot, pkgJsonPath).startsWith('..')
  );
}

function pushUnique(array: string[], value: string) {
  if (!array.includes(value)) array.push(value);
}

function compareDepChains(left: string, right: string) {
  const leftDepth = left.split(' > ').length;
  const rightDepth = right.split(' > ').length;

  if (leftDepth !== rightDepth) return leftDepth - rightDepth;
  return left.localeCompare(right);
}

function isDepIncluded(
  dep: string,
  optimizeDepsInclude: NonNullable<DepOptimizationOptions['include']>,
) {
  return optimizeDepsInclude.some((include) => dep === include);
}

function isDepExcluded(
  dep: string,
  optimizeDepsExclude: NonNullable<DepOptimizationOptions['exclude']>,
) {
  return optimizeDepsExclude.some((exclude) => dep === exclude || dep.startsWith(`${exclude} > `));
}

function isDepNoExternaled(dep: string, ssrNoExternal: NonNullable<SSROptions['noExternal']>) {
  if (typeof ssrNoExternal === 'boolean') return ssrNoExternal;
  const noExternals = Array.isArray(ssrNoExternal) ? ssrNoExternal : [ssrNoExternal];

  return noExternals.some((noExternal) => {
    if (typeof noExternal === 'string') return dep === noExternal;
    return noExternal.test(dep);
  });
}

function isDepExternaled(dep: string, ssrExternal: NonNullable<SSROptions['external']>) {
  if (typeof ssrExternal === 'boolean') return ssrExternal;
  return ssrExternal.some((external) => dep === external);
}
