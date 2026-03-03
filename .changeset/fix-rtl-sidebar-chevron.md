---
'fumadocs-ui': patch
'@fumadocs/base-ui': patch
---

fix: reverse sidebar chevron direction for RTL layouts

In RTL mode, the `ChevronDown` icon in collapsed sidebar folders was
incorrectly pointing to the right (via `-rotate-90`). Added `rtl:rotate-90`
so the icon points to the left when the folder is collapsed, matching
the expected RTL reading direction.
