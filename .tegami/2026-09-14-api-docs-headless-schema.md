---
packages:
  npm:@fumadocs/api-docs: minor
---

## Headless Schema UI

The generation and navigation state of the Schema UI moved into the new `@fumadocs/api-docs/headless` entry: `generateSchemaUI()`, `<SchemaUIProvider />`, `useSchemaUI()`, `useSchemaTabs()`, `useSchemaPopover()`, `useSchemaHighlight()` and `useCopySchemaLink()`. The Schema UI installed with Fumadocs CLI only renders, the logic stays in the package.

`SchemaData.infoTags` entries are now data (`{ label, value, block?, prose? }`) rendered by the UI, custom nodes (`{ node }`) are still accepted. Code reading `tag.node` must handle both shapes.
