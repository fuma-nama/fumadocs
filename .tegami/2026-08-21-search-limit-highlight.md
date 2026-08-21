---
packages:
  npm:fumadocs-core:
    type: patch
---

## Highlight only the search results within `limit`

`limit` bounds the returned hits, so search now stops at that many results instead of highlighting every matched page and slicing afterwards.
