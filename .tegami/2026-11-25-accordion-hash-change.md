---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Open accordions on hash change

- `Accordions` open the item whose `id` matches the URL hash when the hash changes, not only on page load.
