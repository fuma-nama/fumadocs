---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/language': patch
---

### Unions of `const` members and `string` suggest their values

- In the playground, a `oneOf`/`anyOf` of `const` strings and `string` is one input that suggests the `const` members, labelled by their `title` and filtered as you type, while it still takes any string, instead of a switch between members.
