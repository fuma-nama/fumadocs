---
packages:
  'fumadocs-openapi': minor
  '@fumadocs/asyncapi': minor
  '@fumadocs/graphql': minor
---

### Deprecated standalone loader plugins

- Deprecated `openapiPlugin()`, `asyncapiPlugin()` and `graphqlPlugin()` of `/server`: use `loaderPlugin()` of `createOpenAPI()`, `createAsyncAPI()` and `createGraphQL()` instead.
