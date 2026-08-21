---
packages:
  npm:fumadocs-mdx:
    type: patch
---

## Scope `lastModified` git log to the content directory

`git log` is scoped to the collection's content directory instead of buffering the repository's entire history in every worker.
