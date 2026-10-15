---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Share `@fumari/stf` and `@fumadocs/json-schema` with installed UI

They are depended on with a caret range instead of an exact version, so UI installed with Fumadocs CLI can share one copy with the package.
