---
packages:
  '@fumadocs/satteri': patch
---

### Record JSX elements as one HTML tag in structured data

With `stringify` of `remarkStructure()`, JSX elements kept by `filterElement` were recorded as their MDX source, including expressions like `type={...}`. Type tables from `auto-type-table` recorded their whole generated type table, and search dialogs couldn't render it as an element.

They are now recorded as an HTML tag synthesized from their fields: expression values become strings, and all values are kept on one line and truncated, so search dialogs render them as a component.
