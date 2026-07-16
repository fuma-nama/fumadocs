---
packages:
  npm:fumadocs-openapi: patch
---

## Harden `createProxy()` against SSRF

- `allowedOrigins` now defaults to the proxy route's own origin, so an unconfigured proxy is same-origin only instead of an open proxy. A warning is logged when neither `allowedOrigins` nor `filterRequest` is set.
- The allowlist is now enforced on redirects: an allowed upstream can no longer redirect the proxy to a disallowed origin.
