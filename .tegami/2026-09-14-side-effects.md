---
packages:
  npm:@fumadocs/api-docs: patch
  npm:@fumadocs/asyncapi: patch
  npm:@fumadocs/base-ui: patch
  npm:@fumadocs/basehub: patch
  npm:@fumadocs/cli: patch
  npm:@fumadocs/content: patch
  npm:@fumadocs/content-collections: patch
  npm:@fumadocs/graphql: patch
  npm:@fumadocs/language: patch
  npm:@fumadocs/local-content: patch
  npm:@fumadocs/local-html: patch
  npm:@fumadocs/local-md: patch
  npm:@fumadocs/mdx-remote: patch
  npm:@fumadocs/sanity: patch
  npm:@fumadocs/satteri: patch
  npm:@fumadocs/shadcn: patch
  npm:@fumadocs/story: patch
  npm:@fumadocs/tailwind: patch
  npm:@fumari/image-size: patch
  npm:@fumari/stf: patch
  npm:create-fumadocs-app: patch
  npm:fumadocs-docgen: patch
  npm:fumadocs-epub: patch
  npm:fumadocs-mdx: patch
  npm:fumadocs-obsidian: patch
  npm:fumadocs-openapi: patch
  npm:fumadocs-python: patch
  npm:fumadocs-twoslash: patch
  npm:fumadocs-typescript: patch
  npm:fumadocs-ui: patch
---

## Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.
