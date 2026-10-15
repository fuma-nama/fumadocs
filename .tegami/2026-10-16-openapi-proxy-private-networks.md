---
packages:
  'fumadocs-openapi': patch
---

### Optional `allowedOrigins` in `createProxy()`

- Without `allowedOrigins`, the proxy accepts any public origin instead of its own origin, and refuses hosts on private networks (Node.js and Deno).
- Without `allowedOrigins`, cookies of your site and `Set-Cookie` headers of responses are not forwarded.
- Proxied responses can't run scripts on your site, and their headers that apply to your site (e.g. `Strict-Transport-Security`, `Clear-Site-Data`) are removed.
- Redirects to other origins drop the `Authorization`, `Proxy-Authorization` and `Cookie` headers, like `fetch()`.
- Remove all `Access-Control-*` headers of responses, some were kept before.
- Abort the proxied request when the client disconnects.
- Forward request bodies without a `Content-Length` header, and read them once.
- Respond with 502 instead of 500 to upstream statuses outside 200-599 (e.g. 999).
