---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Expose the search dialog as a combobox

The search input is now a `combobox` that controls a `listbox` of `option` results and reports the highlighted result through `aria-activedescendant`, so screen readers announce results as you move through them. Hidden result buttons are removed from the tab order, and the empty state is announced as a status message.
