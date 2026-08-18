---
packages:
  npm:fumadocs-core:
    type: patch
---

## Loader: `next` parameter for custom `slugs` function

The `slugs` option now receives a `next` function as its second argument, which generates the default slugs from the file path. This lets custom slug functions build on the default generation instead of reimplementing it:

```ts
loader({
  slugs(file, next) {
    if (file.path.startsWith('blog/')) return ['blog', ...next()];
    // return `undefined` to generate default slugs
  },
});
```

**Behavior change:** conflicting cases like `dir/index.mdx` vs `dir.mdx` are now resolved for custom slugs functions as well. Index files are always processed after other pages, and receive an `index` suffix when their slugs (custom or default) collide with an existing page — previously, custom slugs functions that produced such collisions threw a `Duplicated slugs` error.
