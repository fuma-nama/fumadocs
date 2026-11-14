---
packages:
  'fumadocs-openapi': patch
---

### Encode path parameters

- The playground and code usages percent-encode path parameter values, so `#`, `?`, `/` or a space in a value no longer cuts the request URL short or sends it to another path.
