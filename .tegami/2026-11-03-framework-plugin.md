---
packages:
  'fumadocs-core': patch
  'fumadocs-openapi': minor
  '@fumadocs/asyncapi': minor
  '@fumadocs/graphql': minor
  '@fumadocs/notion': patch
  'fumadocs-obsidian': patch
  '@fumadocs/sanity': patch
---

### Framework plugins

- Added `fumadocs-core/framework/plugin`: the plugin API for integrations to add routes, head tags and page content to frameworks.
- Integrations export their plugin from `/plugin`: `openapiPlugin()`, `asyncapiPlugin()`, `graphqlPlugin()`, `notionPlugin()`, `obsidianPlugin()` and `sanityPlugin()`.
- `/plugin` of OpenAPI and AsyncAPI exports `loadDocument`, of GraphQL `loadSchema`: pass it to your own page component when documents are left out of page props.
- Deprecated `openapiPlugin()`, `asyncapiPlugin()` and `graphqlPlugin()` of `/server`, use `loaderPlugin()` of the server.
