---
packages:
  npm:@fumadocs/api-docs: patch
---

## Keep overlapping `type` sets when merging `allOf`

`intersection` treated any difference in the `type` keyword as an impossible schema and returned `false`, so an `allOf` member using a type array (e.g. `['string', 'null']`, emitted for `nullable: true`) merged with a typed member (`type: 'string'`) produced `false` instead of `type: 'string'` — dropping every property of the schema in the Schema UI and the playground.

Intersecting overlapping type sets now keeps the shared members, and only genuinely disjoint types (e.g. `['string']` with `['number']`) resolve to `false`.
