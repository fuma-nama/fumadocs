---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
---

### Unions of `const` members render as a labelled select

- In the playground, a `oneOf`/`anyOf` whose members are all `const` is one select labelled by each member's `title`, instead of a switch between members.
