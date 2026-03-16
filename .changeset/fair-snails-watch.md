---
'fumadocs-mdx': patch
---

Fix dynamic index generation so generated `dynamic.ts` imports `node:path` and passes lazy entries to `create.doc()` / `create.docs()` as arrays.
