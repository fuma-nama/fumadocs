---
'fumadocs-core': minor
---

**Introduce page tree transformer API**

You can now define page tree transformer.

```ts
export const source = loader({
  // ...
  pageTree: {
    transformers: [{
      root(root) {
        return root;
      },
      file(node, file) {
        return node;
      },
      folder(node, dir, metaPath) {
        return node;
      },
      separator(node) {
        return node;
      }
    }]
  }
});
```
