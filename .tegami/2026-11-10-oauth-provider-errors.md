---
packages:
  'fumadocs-openapi': patch
---

### Show OAuth provider errors in the playground

- When the OAuth provider refuses a flow (e.g. `access_denied`), the playground shows its error instead of returning silently.
