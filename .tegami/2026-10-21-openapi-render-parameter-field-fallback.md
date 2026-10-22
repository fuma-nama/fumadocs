---
packages:
  'fumadocs-openapi': patch
---

### `renderParameterField` can keep the default input

When `renderParameterField` returns `undefined` for a parameter, the playground renders its default input, so you can customize a few parameters without re-implementing the rest. Return `null` to render nothing.
