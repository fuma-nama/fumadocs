---
packages:
  'fumadocs-core': minor
  'fumadocs-typescript': minor
  '@fumadocs/satteri': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
---

### Index tables by row

Structured data records each table row as a Markdown table of its header row and itself, instead of a record per cell. Type tables from `auto-type-table` record a row for each prop instead of the `TypeTable` element. Re-sync your search indexes to pick them up.

- `remarkStructure()` defaults `types` to `table` instead of `tableCell`.
- `tableRowToStructuredData()` from `fumadocs-core/search` creates the structured data of a table row.
- Search hooks group the rows of a table into a `table` item, `<SearchDialogList />` renders it with `Table`, `<SearchDialogListTable />` by default.
- Algolia and Orama Cloud link to the anchor of every record, like the props of type tables.
- Orama Cloud searches `title`, `section` and `content` by default, set `params.properties` to search other fields.
- `remarkStructure()` of Sätteri records the `data.structuredData` of nodes in place of the nodes.
