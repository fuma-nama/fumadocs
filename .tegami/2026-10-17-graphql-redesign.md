---
packages:
  '@fumadocs/graphql': minor
  '@fumadocs/language': patch
---

### Redesigned GraphQL pages

- Operation pages start with their signature, like `QUERY customer(id: ID!): Customer`, and keep the types they use in place: Schema UI cards to explore them, hover cards with their definitions.
- Pages of named types are opt-in with `includeTypes`, they show the SDL of types and where they are used.
- Example requests and responses beside operations, with a select of examples and code samples in cURL, JavaScript, Go, Python, Java, C# and Rust.
- Named examples from GraphQL documents with the `examples` option of `createGraphQL()`.
- The playground opens in a dialog: an editor with validation and formatting, a field picker, variables as a form or JSON, headers, and responses with their GraphQL errors.
- The playground runs subscriptions over graphql-ws or GraphQL over SSE (`subscriptionUrl`), and logs their events.
- Directives applied in the schema show their definitions, `@oneOf` input objects are supported.
- `getText()` returns pages in Markdown for LLMs, operations with the SDL of types they use.
- Chinese translations of GraphQL pages in `@fumadocs/language`.

### API changes

| Before                                                                   | Now                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| pages of named types by default                                          | `includeTypes: true`, also for `per: 'file'`               |
| `useOperation().example`                                                 | `examples`, with `selected` and `select()`                 |
| `slots.relations` and `slots.scalar` of `renderTypeLayout`               | `slots.definition`, `usages` and `sdl`                     |
| `@fumadocs/graphql/utils/snippets`                                       | the `codeUsages` option                                    |
| `HeaderItem` and `filterHeaderItems` from `@fumadocs/graphql/playground` | stored headers are objects by origin                       |
| `inputTypeToJsonSchema(type, depth)`                                     | `inputTypeToJsonSchema(type)`, recursive inputs are shared |

- Added `createCodeUsageGeneratorRegistry()` and `registerDefaultCodeUsages()` to `@fumadocs/graphql/ui`.
- Added `subscribeGraphQL()`, `getSubscriptionUrl()` and the `SubscriptionError` type to `@fumadocs/graphql/playground`.
- Added `relations.unions` to `useNamedType()`.
