import fs from 'node:fs/promises';
import path from 'node:path';
import { crawlFrameworkPkgs, type CrawlResult } from '../vitefu';

/**
 * Vite config for a project using Fumadocs, derived from its installed dependencies.
 *
 * Our packages are served as source rather than pre-bundled, which means Vite also serves their
 * dependencies raw and no longer discovers the CommonJS ones on its own. The crawl walks the
 * project's tree to name them explicitly:
 * https://vite.dev/config/dep-optimization-options#optimizedeps-exclude
 */
export async function getConfig(options: { root: string; isBuild: boolean }) {
  const { framework, include } = await crawlCached(options.root);

  return {
    optimizeDeps: { include, exclude: framework },
    ssr: { noExternal: framework },
    // `optimizeDeps` only runs the dev server's pre-bundling, builds go through Rollup and never
    // see it. Bundlers that keep a CommonJS `require('react')` intact (Nitro does, Waku doesn't)
    // hand Base UI's store shim a second React instance, whose hook dispatcher is null — so on
    // builds the shim has to be replaced outright. React 19 exports the hook it forwards to.
    resolve: options.isBuild ? { alias: buildAlias } : {},
  };
}

const buildAlias = [{ find: /^use-sync-external-store\/shim$/, replacement: 'react' }];

const cache = new Map<string, { key: string; result: Promise<CrawlResult> }>();

// Vite resolves the config once per build environment, and again on dev server restarts
async function crawlCached(root: string) {
  const key = await getInstallKey(root);
  const cached = key && cache.get(root);
  if (cached && cached.key === key) return cached.result;

  const result = crawlFrameworkPkgs(root, (name) => {
    if (name.startsWith('@fumadocs/') || name.startsWith('fumadocs-')) return true;

    // no CommonJS below these, crawling them is wasted work
    switch (name) {
      case 'vite':
      case 'waku':
      case 'shiki':
        return false;
    }
  });

  if (key) {
    cache.set(root, { key, result });
    result.catch(() => cache.delete(root));
  }
  return result;
}

// written by package managers on install, the same files Vite hashes for its dependency cache
const installStateFiles = [
  'node_modules/.pnpm/lock.yaml',
  'node_modules/.package-lock.json',
  'node_modules/.yarn-state.yml',
  'bun.lock',
];

async function getInstallKey(root: string): Promise<string | undefined> {
  for (let dir = root; ; dir = path.dirname(dir)) {
    for (const file of installStateFiles) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath).catch(() => undefined);
      if (stat) return `${filePath}:${stat.mtimeMs}:${stat.size}`;
    }
    if (path.dirname(dir) === dir) return;
  }
}
