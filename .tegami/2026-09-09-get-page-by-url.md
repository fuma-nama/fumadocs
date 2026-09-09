---
packages:
  npm:fumadocs-core: patch
---

## `getPageByUrl()` on the loader

Look up a page by its URL:

```ts
source.getPageByUrl('/docs/getting-started');
source.getPageByUrl('/cn/docs/getting-started', 'cn');
```

Without the `language` argument every language is looked up, unlike `getPageByHref()` which resolves the default language only.
