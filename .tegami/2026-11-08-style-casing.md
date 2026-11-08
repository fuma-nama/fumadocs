---
packages:
  'fumadocs-core': patch
---

### Rendering Inline Styles

- Inline styles follow `hast-util-to-jsx-runtime` 2.3.7: property names are lowercased, custom properties keep their case, and only `url()` keeps a `;` inside parentheses.
