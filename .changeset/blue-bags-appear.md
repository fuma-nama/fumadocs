---
'fumadocs-core': minor
---

**Include locale code into `page.path`**

Previously when i18n is enabled, `page.path` is not equal to the virtual file paths you passed into `loader()`:

```ts
const source = loader({
  source: {
    files: [{
      path: 'folder/index.cn.mdx'
      // ...
    }]
  }
});

console.log(source.getPages("cn"));
// path: folder/index.mdx
```

This can be confusing, the only solution to obtain the original path was `page.absolutePath`.

From now, the `page.path` will also include the locale code:

```ts
const source = loader({
  source: {
    files: [{
      path: 'folder/index.cn.mdx'
      // ...
    }]
  }
});

console.log(source.getPages('cn'));
// path: folder/index.cn.mdx
```

While this change doesn't affect intended API usages, it **may lead to minor bugs** when advanced usage/hacks involved around `page.path`.