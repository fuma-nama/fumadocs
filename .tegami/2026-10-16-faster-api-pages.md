---
packages:
  '@fumadocs/json-schema': patch
  'fumadocs-openapi': patch
  'fumadocs-core': patch
---

### Faster API pages and search indexes

- Schema UI generates the schemas it shows when they open, instead of every schema reachable from the root.
- Inline schemas are identified by their position, links to their properties copied before this version no longer open them.
- TypeScript definitions of bodies are generated when copied.
- Search indexes take breadcrumbs from one walk of the page tree, instead of a search for each page.
