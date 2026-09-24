---
packages:
  'fumadocs-ui': patch
---

### Remove hidden sidebar controls from the tab order

The collapsed sidebar's floating pill and the off-screen collapsed sidebar itself are now `inert` while hidden, and collapsing/expanding the sidebar moves focus to the control that becomes visible instead of dropping it to the page body.
