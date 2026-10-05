---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Ignore unknown values in tab groups

Tabs with a `groupId`, including code block tabs with `tab-group`, applied persisted or shared values even when none of their tabs matched, for example after renaming a tab, or when tabs in the same group have different items. They then showed no content until a tab was clicked. Such values are now ignored.
