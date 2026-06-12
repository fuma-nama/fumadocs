---
'fumadocs-ui': patch
'@fumadocs/base-ui': patch
'fumadocs-core': patch
---

Deprecate `type: "xxx"` usage of `useDocsSearch()`, pass the `client` object instead. The allows a smaller bundle size with improved performance.
