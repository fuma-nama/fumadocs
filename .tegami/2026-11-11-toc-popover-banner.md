---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### TOC Popover is No Longer a Banner Landmark

- The `<header>` of the mobile TOC popover has `role="none"`, so pages no longer expose a second banner landmark next to the navbar.
