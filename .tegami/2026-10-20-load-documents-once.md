---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Load documents once

- `includeDocument: false` of `createOpenAPI()` and `createAsyncAPI()` leaves documents out of page props, pages load each one once per browser session with `loadDocument` of `createOpenAPIPage()` and `createAsyncAPIPage()`.
- Same for GraphQL schemas: `includeSchema: false` of `createGraphQL()` with `loadSchema` of `createGraphQLPage()`.
