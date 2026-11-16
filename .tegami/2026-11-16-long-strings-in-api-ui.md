---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Long paths and strings in API pages

- A long field path in the playground truncates its middle crumbs and keeps Unset and Remove in reach, instead of widening the form under the request panel.
- Long unbroken strings in descriptions wrap inside property cards, security scheme cards, playground panels and field info popovers.
