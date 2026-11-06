---
packages:
  'fumadocs-core': patch
---

### Fix same-page anchors on React Router

- Same-page anchors like TOC items and heading links now create history entries with their own key, so `<ScrollRestoration />` no longer overrides their scroll and restores the right position on back and forward.
