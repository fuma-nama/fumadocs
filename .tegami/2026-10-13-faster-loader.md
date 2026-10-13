---
packages:
  'fumadocs-core': patch
---

### Faster `loader()`

- Page trees are built faster, especially with custom `sort` options.
- Faster `loader()` setup and page lookups like `getPage()` and `getPageByUrl()`.
- Fallback page trees of i18n sources keep the locale in URLs and IDs.
- A page listed in `pages` is no longer duplicated when another folder takes it with a higher priority, like `pagesIndex`.
