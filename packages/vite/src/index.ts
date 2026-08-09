import { crawlFrameworkPkgs } from '../vitefu';

/**
 * Vite config for a project using Fumadocs, derived from its installed dependencies.
 *
 * Our packages are served as source rather than pre-bundled, which means Vite also serves their
 * dependencies raw and no longer discovers the CommonJS ones on its own. The crawl walks the
 * project's tree to name them explicitly:
 * https://vite.dev/config/dep-optimization-options#optimizedeps-exclude
 */
export async function getConfig(options: { root: string; isBuild: boolean }) {
  const out = await crawlFrameworkPkgs({
    root: options.root,
    isBuild: options.isBuild,
    isFrameworkPkgByName(pkgName) {
      if (pkgName.startsWith('@fumadocs/') || pkgName.startsWith('fumadocs-')) return true;

      // no CommonJS below these, crawling them is wasted work
      switch (pkgName) {
        case 'vite':
        case 'waku':
        case 'shiki':
          return false;
      }
    },
  });

  return {
    optimizeDeps: out.optimizeDeps,
    ssr: {
      noExternal: out.ssr.noExternal,
    },
    // `optimizeDeps` only runs the dev server's pre-bundling, builds go through Rollup and never
    // see it. Bundlers that keep a CommonJS `require('react')` intact (Nitro does, Waku doesn't)
    // hand Base UI's store shim a second React instance, whose hook dispatcher is null — so on
    // builds the shim has to be replaced outright. React 19 exports the hook it forwards to.
    resolve: options.isBuild ? { alias: buildAlias } : {},
  };
}

const buildAlias = [{ find: /^use-sync-external-store\/shim$/, replacement: 'react' }];
