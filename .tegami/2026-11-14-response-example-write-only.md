---
packages:
  'fumadocs-openapi': patch
---

### Response examples without write-only fields

- Response examples generated from a schema leave out `writeOnly` properties, like the response schema and its TypeScript definitions already do.
