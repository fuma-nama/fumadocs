---
packages:
  'fumadocs-openapi': patch
---

### OAuth redirect on static sites

- `createOAuthHandler({ inline: true })` puts its script in the page, so the redirect route can be prerendered on static sites.
