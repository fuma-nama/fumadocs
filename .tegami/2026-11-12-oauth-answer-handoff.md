---
packages:
  'fumadocs-openapi': patch
---

### Keep OAuth answers out of the page address

- `createOAuthHandler()` hands the authorization code or token to the playground through `sessionStorage`, so scripts on the docs page no longer see it in the address.
