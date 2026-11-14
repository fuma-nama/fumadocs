---
packages:
  'fumadocs-core': patch
---

### Flexsearch builds each locale on its first search

- `flexsearchFromSource()` and `flexsearchI18n()` build the index of a locale when it is first searched, instead of every locale on the first request.
