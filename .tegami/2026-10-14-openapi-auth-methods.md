---
packages:
  'fumadocs-openapi': minor
  '@fumadocs/language': patch
---

### All security schemes in the API playground

- Support OAuth 2.0 `deviceAuthorization` flows, `openIdConnect` schemes and PKCE.
- OAuth requests with a client secret and device flows go through `proxyUrl` when set, allow your authorization server in `allowedOrigins`.
- The OAuth panel remembers client credentials.
- `mutualTLS` schemes no longer send an `Authorization` header.
- Headless: `useOAuthFlows()`, `requestOAuthToken()` accepts `onUserCode`, `signal` and `proxyUrl`.
- Added translation keys to `@fumadocs/language`.
