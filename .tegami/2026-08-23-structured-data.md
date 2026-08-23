---
packages:
  npm:fumadocs-core: minor
  npm:@fumadocs/local-md: minor
  npm:@fumadocs/local-html: minor
  npm:fumadocs-obsidian: minor
  npm:@fumadocs/satteri: minor
---

## Read structured data from `page.data.structuredData()`

Search indexing no longer falls back to `(await page.data.load()).structuredData`. Runtime content sources expose `structuredData()` on page data instead, sharing the compile with `load()`:

```ts
const structuredData = await page.data.structuredData();
```

The renderer returned by `load()` still carries `structuredData`, existing code keeps working.
