---
packages:
  '@fumadocs/notion': patch
  '@fumadocs/sanity': patch
  'fumadocs-obsidian': patch
---

### Options of the Notion, Sanity and Obsidian plugins

- `notionPlugin()` accepts a `Renderer` to replace `NotionRenderer`.
- `sanityPlugin()` accepts a `docType` to render only documents of that `_type`.
- `ObsidianSource` defaults its schema type parameters, so `ObsidianSource` names any vault.
