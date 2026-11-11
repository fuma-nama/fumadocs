---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Current Page in the Sidebar

- The active sidebar link has `aria-current="page"`, so screen readers announce which page is the current one. Applies to `SidebarItem`, `SidebarFolderLink` and the Glass layout's sidebar.
