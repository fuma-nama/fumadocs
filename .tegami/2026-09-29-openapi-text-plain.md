---
packages:
  'fumadocs-openapi': patch
---

### Support `text/plain` request bodies with parameters

A request body of `text/plain; charset=utf-8` was rejected as an unsupported media type, while `text/plain` worked.
