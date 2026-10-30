---
packages:
  'fumadocs-openapi': patch
---

### OAuth handler reads a `__Host-` cookie

The playground saves the page to return to in a `__Host-` cookie, so other subdomains can't set where `createOAuthHandler()` redirects. The flow now requires HTTPS, or `localhost` in development.
