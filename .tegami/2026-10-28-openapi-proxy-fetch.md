---
packages:
  'fumadocs-openapi': patch
---

### The proxy keeps `fetch()` working

- Without `allowedOrigins`, the proxy imports undici, which replaced the dispatcher of the built-in `fetch()`. Afterwards, `fetch()` rejected requests setting `content-length`, and ignored configured dispatchers like `NODE_USE_ENV_PROXY`. The dispatcher is now restored.
- The proxy no longer forwards `content-length`, `fetch()` sets it from the body.
