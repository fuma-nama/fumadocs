---
packages:
  'fumadocs-openapi': patch
---

### Unions of `const` members render as a labelled select

A field whose `oneOf`/`anyOf` members are all `const` shows a single select in the playground, labelled by each member's `title` with its `description` underneath, instead of a switch between members. This is the JSON Schema way to give enum values readable names.
