import { findClosestPkgJsonPath, readJson } from '../vitefu';
import data from './generated.json';

/**
 * `use-sync-external-store` is a CommonJS package Base UI depends on for React 17, where
 * `useSyncExternalStore` wasn't built into React yet.
 *
 * When it is bundled for SSR, its `require('react')` stays a runtime require, so it ends up with a
 * different React instance than the bundled one the renderer installs its hook dispatcher on.
 * Calling a hook then reads a null dispatcher and every component using a Base UI store (dialogs,
 * navigation menu, scroll area) throws during SSR.
 *
 * We require React 19, where the shim only forwards to React's own `useSyncExternalStore`.
 */
const alias = [{ find: /^use-sync-external-store\/shim$/, replacement: 'react' }];

export async function getConfig(options: { root: string }) {
  const pkgJsonPath = await findClosestPkgJsonPath(options.root);

  if (!pkgJsonPath) {
    return {
      optimizeDeps: { include: [], exclude: [] },
      ssr: { noExternal: [] },
      resolve: { alias },
    };
  }

  const pkgJson = await readJson(pkgJsonPath).catch((e: unknown) => {
    throw new Error(`Unable to read ${pkgJsonPath}`, { cause: e });
  });
  const out = structuredClone(data);
  const deps = new Set();
  if (pkgJson.dependencies) {
    for (const name in pkgJson.dependencies) deps.add(name);
  }
  if (pkgJson.devDependencies) {
    for (const name in pkgJson.devDependencies) deps.add(name);
  }

  out.optimizeDeps.include = out.optimizeDeps.include.filter((item) => {
    const first = item.slice(0, item.indexOf(' > '));
    return deps.has(first);
  });

  out.optimizeDeps.exclude = out.optimizeDeps.exclude.filter((item) => deps.has(item));
  out.ssr.noExternal = out.ssr.noExternal.filter((item) => deps.has(item));
  return { ...out, resolve: { alias } };
}
