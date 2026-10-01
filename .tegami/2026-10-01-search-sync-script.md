---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Read the pre-rendered `static.json` directly in search sync scripts

`feature search` writes the path of the pre-rendered `static.json` into `scripts/sync-content.ts`, and the `build` script runs it without arguments.

On TanStack Start, the path follows the Nitro output: `.output/public`, `.vercel/output/static` with the `vercel` preset, or `dist/client` without Nitro.
