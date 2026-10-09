---
packages:
  'fumadocs-openapi': minor
---

### Auth providers in the API playground

- `playground.authProviders` handle security schemes: their rows, panels like signing in, and how values are sent. Omitted options come from the built-in providers.
- Sign-ins leaving the page use `useAuthRedirect()`.
- HTTP schemes other than Basic default to their own prefix, like `Token `.
- The username and password of HTTP Basic auth are remembered.
- OpenID Connect schemes default to a `Bearer` token.

Fix [#3671](https://github.com/fuma-nama/fumadocs/issues/3671)
