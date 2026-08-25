---
packages:
  npm:fumadocs-openapi: patch
  npm:@fumadocs/language: patch
---

## Enhance result display of API playground

The response panel now gives you the full picture of a request:

- the resolved request URL, including path and query parameters
- response headers in a collapsible list
- response body labeled with its content type

Client-side errors also show the request URL, making issues like a wrong server URL easy to spot.

For custom `ResultDisplay` components, `FetchResult` now carries a `url` field.

`@fumadocs/language` includes translations for the new UI.
