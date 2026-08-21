---
packages:
  npm:fumadocs-core:
    type: patch
  npm:@fumadocs/notion:
    type: patch
---

## Do not cache rejected promises

The dynamic loader's `files()`, Notion's page `load()`, `createFromSource`'s index build, and Shiki factory init retry on the next call after a transient failure, instead of returning the same rejection forever.
