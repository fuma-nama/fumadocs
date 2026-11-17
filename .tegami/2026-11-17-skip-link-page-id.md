---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Fix the skip link when `DocsPage` has an `id`

- `DocsPage` keeps `id="nd-page"`, so the layout's "Skip to Content" link always reaches the page.
