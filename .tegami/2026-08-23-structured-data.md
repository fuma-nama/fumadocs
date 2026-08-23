---
packages:
  npm:fumadocs-core: patch
  npm:@fumadocs/local-md: patch
  npm:@fumadocs/local-html: patch
  npm:fumadocs-obsidian: patch
  npm:@fumadocs/satteri: patch
---

## Read structured data from `page.data.structuredData()`

Search indexing no longer falls back to `(await page.data.load()).structuredData`. Runtime content sources expose `structuredData()` on page data instead, sharing the compile with `load()`:

```ts
const structuredData = await page.data.structuredData();
```

The renderer returned by `load()` still carries `structuredData`, existing code keeps working.
