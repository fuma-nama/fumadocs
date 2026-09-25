---
packages:
  'fumadocs-openapi': patch
---

### Send uppercase HTTP methods from the playground

The Fetch API only normalizes the case of some methods, so PATCH requests were sent as `patch`, which servers and edges like Vercel reject.
