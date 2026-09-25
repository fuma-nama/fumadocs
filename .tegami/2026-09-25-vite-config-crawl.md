---
packages:
  'fumadocs-mdx': patch
---

### Stop recrawling `node_modules` on every Vite config resolution

The config hook of `fumadocs-mdx/vite` walked the dependency tree below Fumadocs packages once per chain reaching a package, so a docs app with a few Fumadocs packages read ~10k `package.json` files (~0.9s) each time Vite resolved its config, which it does once per build environment.

The crawl now visits each package once, breadth-first, and still records the shortest chain to every CommonJS dependency (`fumadocs-ui > @base-ui/react > use-sync-external-store/shim` and friends). The result is memoized for the process until the package manager's install state changes, so a build with several environments crawls once.
