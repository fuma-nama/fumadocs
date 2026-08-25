---
packages:
  npm:fumadocs-python: patch
---

## `groupBy` option

Generated pages are grouped in a directory named after the root module. Set `groupBy: 'none'` to place them at the root of the source instead, the root module becomes `index.mdx`:

```ts
const python = createPython({
  file: './httpx.json',
  groupBy: 'none',
});
```

`convert()` accepts the same option.
