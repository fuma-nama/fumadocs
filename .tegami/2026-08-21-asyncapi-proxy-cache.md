---
packages:
  npm:@fumadocs/asyncapi:
    type: patch
---

## Cache the document proxy in `toStaticData`

Matches `fumadocs-openapi`: the magic proxy is created once per document instead of once per generated page.
