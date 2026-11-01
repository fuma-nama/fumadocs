---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Cheaper restyles on DOM changes in layouts

- The `layout:` variant matches direct children of the layout (up to three levels down in Spacious), so inserting or removing nodes no longer re-checks the whole layout for its variables.
