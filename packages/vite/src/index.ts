import { findClosestPkgJsonPath, readJson } from '../vitefu';
import data from './generated.json';

export async function getConfig(options: { root: string }) {
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
  return out;
}
