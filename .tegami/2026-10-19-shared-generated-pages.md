---
packages:
  'fumadocs-core': patch
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Generated pages in every language

- Virtual files accept a `locale`, `$` for every language, instead of parsing it from their path.
- Pages from `staticSource()` and `dynamicSource()` of OpenAPI, AsyncAPI and GraphQL are shared with every language of `loader()`.

Fix [#3720](https://github.com/fuma-nama/fumadocs/issues/3720)
