---
packages:
  'fumadocs-openapi': patch
---

### Names for the selects of operation pages

The selects that switch the code language, the example request, the response status, the media type, the security scheme and the variant of a union schema now have an accessible name, so a screen reader announces what they choose and not only their value. The names go through `t()` like the other labels. `ExampleSelect` accepts an `aria-label`.
