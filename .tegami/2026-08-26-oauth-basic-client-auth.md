---
packages:
  npm:fumadocs-openapi: patch
  npm:@fumadocs/language: patch
---

## Support HTTP Basic client authentication in OAuth password flow

Some OAuth servers require client credentials in an HTTP Basic `Authorization` header instead of the request body. The password flow dialog now offers a Client Authentication select to choose between the two methods, as described in [RFC 6749, section 2.3.1](https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1).

Fix [#3506](https://github.com/fuma-nama/fumadocs/issues/3506)
