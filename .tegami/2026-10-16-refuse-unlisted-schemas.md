---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Refuse schemas not listed in `input`

- `getSchema()` and page preloads throw for schema IDs not listed in `input`, instead of loading them as file paths or URLs.
