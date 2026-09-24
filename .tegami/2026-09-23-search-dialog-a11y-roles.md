---
packages:
  "fumadocs-ui": patch
---

### Add combobox/listbox/option roles to the search dialog

The search dialog's input, results list, and result items now expose the standard ARIA combobox/listbox/option pattern, fixing an `aria-allowed-attr` violation and giving screen reader users correct semantics while navigating results.
