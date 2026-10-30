---
packages:
  'fumadocs-openapi': patch
---

### Fix OAuth handler redirects that other subdomains could control

`createOAuthHandler()` read the page to return to from a cookie, which other subdomains could set to send authorization codes and tokens to another site. The page is now kept in `sessionStorage`, and the handler sends users back from the browser.

It loads its script from the same route, Content Security Policies need to allow `'self'` scripts there (without `'strict-dynamic'`), or leave the route out.
