---
packages:
  'fumadocs-openapi': major
---

### Remove `usePlaygroundAuth()`

OAuth flows that leave the page, like authorization code, return through `useAuthRedirect()` only.

- `authorize()` and `requestOAuthToken()` without `redirect` no longer finish them, call `useAuthRedirect(field, onReturn)` with `finishOAuthFlow()` instead.
- Playground UIs installed with Fumadocs CLI before `12.4.0` use `usePlaygroundAuth()`, install them again: `npx @fumadocs/cli add openapi/playground` (or `openapi/page`).
