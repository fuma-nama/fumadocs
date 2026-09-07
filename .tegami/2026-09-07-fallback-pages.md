---
packages:
  npm:fumadocs-core: minor
---

## Mark fallback pages

With i18n, a locale without a translation of a page inherits the file of the fallback language. Such pages now carry `fallback: true`, so integrations can tell a real translation from an inherited one, e.g. to skip it in a sitemap or point its canonical link at the source page:

```ts
const page = source.getPage(['get-started'], 'cn');

if (page?.fallback) {
  // rendered from the `en` file
}
```
