---
packages:
  'fumadocs-openapi': patch
---

### `renderParameterField` can render the default input with another schema

`renderParameterField` gets `ctx.renderDefault(schema)` as its third argument, which renders the parameter's default input with `schema` replacing its own. For example, an `enum` of values loaded at runtime shows the playground's select.
