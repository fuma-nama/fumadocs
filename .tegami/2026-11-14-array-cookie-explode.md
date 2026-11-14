---
packages:
  'fumadocs-openapi': patch
---

### Array cookies

- An array cookie parameter with `explode` (the default) is sent as `id=3&id=4` by the playground and code usages, instead of repeating its name as `id=id=3&id=4`.
