---
packages:
  npm:fumadocs-mdx: patch
---

## Fix Base UI's `use-sync-external-store` breaking Vite dev servers

The Vite config is now derived from your project's own dependencies at startup, instead of being generated ahead of time against ours.

Builds keep the alias that replaces the shim with React, which is now applied only there. Pre-bundling is a dev server feature, and on builds a bundler that leaves the shim's `require('react')` in place gives it a second React instance whose hook dispatcher is null, breaking every component with a Base UI store.
