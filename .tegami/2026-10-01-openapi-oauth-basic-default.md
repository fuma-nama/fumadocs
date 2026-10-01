---
packages:
  'fumadocs-openapi': patch
---

### Send OAuth client credentials as HTTP Basic by default

Token requests of the playground default to **Send as Basic Auth header**, which RFC 6749 requires authorization servers to support.

- The authorization code flow has the **Client Authentication** selector too, it always sent the client credentials in the body.
- The password flow no longer requires client credentials with either method.
- Without a client secret, the `client_id` is sent in the body instead, as public clients do.

Fix [#3629](https://github.com/fuma-nama/fumadocs/issues/3629)
