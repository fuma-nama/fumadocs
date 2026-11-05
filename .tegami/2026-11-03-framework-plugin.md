---
packages:
  'fumadocs-core': minor
  'fumadocs-openapi': minor
  '@fumadocs/asyncapi': minor
  '@fumadocs/graphql': minor
  '@fumadocs/notion': minor
  'fumadocs-obsidian': minor
  '@fumadocs/sanity': minor
---

### Framework plugins

- Added `fumadocs-core/framework/plugin`: the plugin API for integrations to add routes and page content to frameworks.
- Integrations export their plugin as the default export of `/press`: `openapiPlugin()`, `asyncapiPlugin()`, `graphqlPlugin()`, `notionPlugin()`, `obsidianPlugin()` and `sanityPlugin()`.
- The pages of `staticSource()` and `dynamicSource()` of OpenAPI, AsyncAPI and GraphQL have `full: true` in their page data, like generated files.
