## @fumadocs/notion@0.3.0

### Framework plugins

- Added `fumadocs-core/framework/plugin`: the plugin API for integrations to add routes and page content to frameworks.
- Integrations export their plugin as the default export of `/press`: `openapiPlugin()`, `asyncapiPlugin()`, `graphqlPlugin()`, `notionPlugin()`, `obsidianPlugin()` and `sanityPlugin()`.
- The pages of `staticSource()` and `dynamicSource()` of OpenAPI, AsyncAPI and GraphQL have `full: true` in their page data, like generated files.

### Deprecated `@fumadocs/notion/client`

- Deprecated `@fumadocs/notion/client`: `NotionRenderer` hydrates its components through `'use client'`, they need no registration.

## @fumadocs/notion@0.2.4

### Safer file proxy and links

- `createNotionFileHandler()` caches each file once for all forms of its IDs (case, dashes).
- `//host` and `/\host` links and embeds are treated as other hosts, not paths of the site.

## @fumadocs/notion@0.2.3

### Replace `cnfast` with `cn`

Internal refactor only.

## @fumadocs/notion@0.2.2

### Simplify cache

## @fumadocs/notion@0.2.1

### Remember verified file URLs in the Notion file handler

Every asset request cost between 2 and 34 Notion API calls, so a page with a handful of images tripped the rate limit with two concurrent visitors. The handler now remembers a verified signed URL per block until shortly before Notion's `expiry_time`.

### Do not cache rejected promises

The dynamic loader's `files()`, Notion's page `load()`, `createFromSource`'s index build, and Shiki factory init retry on the next call after a transient failure, instead of returning the same rejection forever.

## @fumadocs/notion@0.2.0

### Support Notion integration

Use Notion as content source.
