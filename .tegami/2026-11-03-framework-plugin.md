---
packages:
  'fumadocs-core': patch
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
  '@fumadocs/notion': patch
  'fumadocs-obsidian': patch
  '@fumadocs/sanity': patch
---

### Framework plugins

- Added `fumadocs-core/framework/plugin`: the plugin API for integrations to add routes, head tags and page content to frameworks.
- Integrations export their plugin from `/plugin`: `openapiPlugin()`, `asyncapiPlugin()`, `graphqlPlugin()`, `notionPlugin()`, `obsidianPlugin()` and `sanityPlugin()`.
