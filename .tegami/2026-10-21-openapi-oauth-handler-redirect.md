---
packages:
  'fumadocs-openapi': patch
---

### OAuth handler only redirects to paths on the same site

`createOAuthHandler()` rejects a return page whose path starts with `//`, which browsers would follow to another origin.
