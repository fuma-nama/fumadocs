---
packages:
  npm:fumadocs-mdx:
    type: patch
---

## Fix Vite dev server crash on declaration-only dependencies

The injected Vite config no longer pre-bundles packages without runtime JavaScript, such as `@types/mdx`. Pre-bundling them made esbuild parse `.d.ts` files and fail on imports that only exist in type space, crashing the dev server.
