---
packages:
  'fumadocs-core': minor
  'fumadocs-typescript': minor
  '@fumadocs/satteri': minor
  'fumadocs-ui': minor
  '@fumadocs/base-ui': minor
---

### Index tables by row

Structured data records each table row as a Markdown table along with its header row, instead of a record per cell. The search dialog shows consecutive rows of a table as one table, with rows without header styled like the props of `TypeTable`.

Type tables from `auto-type-table` record a row for each prop without the header, linked to the prop, instead of the `TypeTable` element.

- `remarkStructure()` defaults `types` to `table` instead of `tableCell`.
- Algolia and Orama Cloud link to the anchor of every record, including anchors that aren't headings, like the props of type tables.
- `remarkStructure()` of Sätteri supports `data.structuredData` and `data._stringify` of nodes, like the remark plugin.
