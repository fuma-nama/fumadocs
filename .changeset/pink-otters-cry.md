---
'next-docs-zeta': major
---

Support `PageTreeBuilder` API

The old `buildPageTree` function provided by 'next-docs-zeta/contentlayer' is now removed. Please use new API directly.

```diff
- import { buildPageTree } from 'next-docs-zeta/contentlayer'
+ import { createPageTreeBuilder } from 'next-docs-zeta/build-page-tree'
```