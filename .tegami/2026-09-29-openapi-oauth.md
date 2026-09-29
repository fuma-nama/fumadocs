---
packages:
  'fumadocs-openapi': patch
---

### Fix OAuth flows of the API playground

- The client credentials flow can send the client credentials in an HTTP Basic `Authorization` header, like the password flow ([#3609](https://github.com/fuma-nama/fumadocs/issues/3609)).
- Relative `authorizationUrl` and `tokenUrl` are resolved against the selected server, `requestOAuthToken()` requires a `serverUrl` for it ([#3610](https://github.com/fuma-nama/fumadocs/issues/3610)).
- The `redirect_uri` leaves out the fragment and query of the page, a fragment is not allowed in redirect URIs.
- Multiple scopes are space-delimited, they were sent as a single scope joined by `+`.
- Query params of `authorizationUrl`, like `audience`, are kept.
- HTTP Basic client credentials are form-encoded, as RFC 6749 requires.
- The implicit and authorization code flows send a random `state`, and keep the flow in `sessionStorage` instead of the URL: the client secret is no longer sent to the authorization server, the token URL resolves against the server selected when the flow starts, and only flows started in the same tab are accepted.
