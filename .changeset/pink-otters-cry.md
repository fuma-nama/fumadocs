---
'next-docs-zeta': major
---

Support build-page-tree API

The old `buildPageTree` function provided by 'next-docs-zeta/contentlayer' is now removed. Please use build-page-tree API directly.

```diff
- import { buildPageTree } from 'next-docs-zeta/contentlayer'
+ import { buildPageTree } from 'next-docs-zeta/build-page-tree'
```