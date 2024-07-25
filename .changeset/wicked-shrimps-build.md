---
'fumadocs-ui': major
---

**Remove `RollButton` component**

**why:** `RollButton` was created because there were no "Table Of Contents" on mobile viewports. Now users can use the TOC Popover to switch between headings, `RollButton` is no longer a suitable design for Fumadocs UI.

**migrate:** Remove usages, you may copy the [last implementation of `RollButton`](https://github.com/fuma-nama/fumadocs/blob/fumadocs-ui%4012.5.6/packages/ui/src/components/roll-button.tsx).
