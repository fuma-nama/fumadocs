---
packages:
  'fumadocs-openapi': patch
---

### Multipart arrays in code usages

- Code usages of `multipart/form-data` bodies send one part for each item of an array, like the playground, instead of the whole array as JSON in one part.
- Object fields are sent as compact JSON, like the playground.
