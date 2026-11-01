---
packages:
  '@fumadocs/tailwind': patch
---

### Cheaper restyles in `prose` content

- Table row borders check only a cell's own row, so an element that stops or starts being a last child (for example when a node is appended to the page) no longer restyles its whole subtree.
