---
packages:
  npm:fumadocs-mdx: patch
---

## Fix the `_mdast` export with `removePosition`

```ts
// fumadocs-mdx collection config
postprocess: {
  includeMDAST: { removePosition: true },
},
```

This exported `_mdast` with no value, and `getMDAST()` then reported that `includeMDAST` was disabled. `removePosition` strips positions in place and returns nothing, so `JSON.stringify` received `undefined`.

The tree is now cloned, stripped, and serialized from the clone.
