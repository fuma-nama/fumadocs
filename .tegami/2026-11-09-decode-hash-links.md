---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Links to Tabs and Accordions with Non-ASCII IDs

- `Tabs`, `Accordions` and `TypeTable` decode the URL hash before matching it, so links to an `id` with non-ASCII characters (e.g. `#标签-cpp`) open the tab or accordion.
