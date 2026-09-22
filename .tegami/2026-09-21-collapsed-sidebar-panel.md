---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Keep the collapsed sidebar's controls off the page title

With the sidebar collapsed, the docs layout floats the reopen and search buttons in a fixed pill at the top-left of the page and starts the article at the same row.
Wherever the article is not centered with room to spare, every viewport below about 1280px, the pill covered the page title.
The article now leaves room for the pill while the sidebar is collapsed.
