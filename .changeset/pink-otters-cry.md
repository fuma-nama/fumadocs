---
'next-docs-zeta': major
---

Create `PageTreeBuilder` API

The old `buildPageTree` function provided by 'next-docs-zeta/contentlayer' is now removed. Please use new API directly, or use the built-in `createContentlayer` utility instead.

```diff
- import { buildPageTree } from 'next-docs-zeta/contentlayer'
+ import { createPageTreeBuilder } from 'next-docs-zeta/server'
```