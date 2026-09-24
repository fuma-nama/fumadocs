---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Remove hidden sidebar controls from the tab order

The collapsed sidebar and its floating pill are now `inert` while hidden, and toggling the sidebar moves focus to the trigger that becomes visible.
