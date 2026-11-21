---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### API docs fixes

- Titles generated from ids keep acronyms and mixed-case names whole, like `HTTPServer` to "HTTP Server" and `KSeF`.
- With `includeDescription`, pages of a tag or a file keep the tag's or the document's description in their body.
- OpenAPI: request bodies and responses of sequential media types with only an `itemSchema` (OpenAPI 3.2), like JSON Lines and Server-Sent Events, show their items' schema, examples and playground.
- OpenAPI: the Scalar modal of `withScalar()` follows the site's light or dark mode.
- OpenAPI: no more undici warning about the `patch` method on the server.
