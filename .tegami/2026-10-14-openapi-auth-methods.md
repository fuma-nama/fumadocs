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
- Headless: `useOpenIdConnectFlows()`, `stf` and `returned` of `usePlaygroundAuth()`, `requestOAuthToken()` accepts `onUserCode`, `signal` and `proxyUrl`.
- Playgrounds on a page share their auth values, `useAuthFields().mapValues()` reads them from the page.
- The playground reopens after OAuth flows return in client-rendered sites.
- Returning OAuth flows no longer switch the security requirement of other playgrounds.
- Added translation keys to `@fumadocs/language`.
