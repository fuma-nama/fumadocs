---
packages:
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Simpler search sync setup

- `feature search` writes the path of the pre-rendered `static.json` into `scripts/sync-content.ts`, and the `build` script runs it without arguments.
- On TanStack Start, the path follows the Nitro output: `.output/public`, `.vercel/output/static` with the `vercel` preset, or `dist/client` without Nitro.
- Typesense documents are built in the `static.json` route, without a separate `lib/export-search-indexes.ts`.
