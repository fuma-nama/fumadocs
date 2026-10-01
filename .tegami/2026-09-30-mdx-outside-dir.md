---
packages:
  'fumadocs-mdx': patch
---

### Keep collection `dir` outside the project in file paths

When a collection's `dir` was outside the project (e.g. `../content/docs`), the leading `../` was dropped from `info.fullPath` and `absolutePath`, so `getText('raw')` failed with `ENOENT`.

Fix [#3623](https://github.com/fuma-nama/fumadocs/issues/3623)
